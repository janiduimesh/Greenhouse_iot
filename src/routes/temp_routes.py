from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import logging
from datetime import datetime, timedelta, timezone
from typing import List
import asyncio

from schema.temp import SensorData, SensorPredictionResponse, SensorForecastPoint
from utils.database import get_database
from routes.alert_routes import check_thresholds, store_alerts

router = APIRouter()
logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        dead = []
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)

        for connection in dead:
            self.disconnect(connection)


manager = ConnectionManager()

@router.post("/sensor-data")
async def receive_sensor_data(data: SensorData):
    """Receive merged greenhouse sensor data from ESP32 and store every 1 minute."""
    payload = data.model_dump()
    logger.info("Incoming data: %s", payload)

    db = get_database()
    latest = db["latest_sensor_readings"]

    now = datetime.now(timezone.utc)

    # Check sensor thresholds and generate alerts
    alerts = check_thresholds({**payload, "device_id": data.device_id})
    stored_alerts = await store_alerts(alerts)

    # Broadcast live payload + any new alerts to WebSocket clients
    broadcast_data = {
        **payload,
        "timestamp": now.isoformat(),
    }
    if stored_alerts:
        broadcast_data["alerts"] = [
            {
                "sensor": a["sensor"],
                "value": a["value"],
                "severity": a["severity"],
                "message": a["message"],
                "icon": a["icon"],
                "timestamp": a["timestamp"].isoformat(),
            }
            for a in stored_alerts
        ]
    await manager.broadcast(broadcast_data)

    last = await latest.find_one({"device_id": data.device_id})

    doc = {
        "device_id": data.device_id,
        "temperature": data.temperature,
        "humidity": data.humidity,
        "soil_moisture_value": data.soil_moisture_value,
        "soil_moisture_percentage": data.soil_moisture_percentage,
        "soil_status": data.soil_status,
        "light_value": data.light_value,
        "light_status": data.light_status,
        "co2_value": data.co2_value,
        "co2_status": data.co2_status,
        "servo_status": data.servo_status,
        "pump_status": data.pump_status,
        "fan_status": data.fan_status,
        "buzzer_status": data.buzzer_status,
        "timestamp": now,
        "created_at": now,
    }

    last = await latest.find_one({"device_id": data.device_id})

    last_time = None
    if last:
        last_time = last.get("created_at")

        if last_time and last_time.tzinfo is None:
            last_time = last_time.replace(tzinfo=timezone.utc)


    if last_time is None or now - last_time >= timedelta(minutes=1):
        await latest.update_one(
            {"device_id": data.device_id},
            {"$set": {**doc, "updated_at": now}},
            upsert=True
        )
        logger.info("Stored sensor reading for device %s", data.device_id)
    else:
        logger.info("Skipped storing reading for %s (within 1 min gap)", data.device_id)

    return {
        "status": "success",
        "device_id": data.device_id,
        "data": payload
    }

@router.websocket("/ws/sensor-data")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await asyncio.sleep(30)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)