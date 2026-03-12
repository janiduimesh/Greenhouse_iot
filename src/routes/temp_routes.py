from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
import requests
import logging
import os
from datetime import datetime, timedelta

from schema.temp import SensorData
from utils.database import get_database
from typing import List
import asyncio

router = APIRouter()
logger = logging.getLogger(__name__)

# # Get ESP32 IP from environment variable or use default
# ESP32_IP = os.getenv("ESP32_IP", "192.168.43.168")
# ESP32_URL = f"http://{ESP32_IP}/distance"
# REQUEST_TIMEOUT = int(os.getenv("ESP32_TIMEOUT", "5"))  

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
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)

        for connection in dead:
            self.disconnect(connection)

manager = ConnectionManager()


@router.post("/sensor-data")
async def receive_sensor_data(data: SensorData):
    """Receive sensor readings from ESP32 and persist every 15 minutes per device."""
    payload = data.model_dump()
    print("Incoming data:", payload)

    await manager.broadcast(payload)

    db = get_database()
    readings = db["sensor_readings"]

    now = datetime.utcnow()

    last = await readings.find_one(
        {"device_id": data.device_id},
        sort=[("created_at", -1)],
    )

    if last is None or now - last["created_at"] >= timedelta(minutes=1):
        doc = {
            "device_id": data.device_id,
            "temperature": data.temperature,
            "humidity": data.humidity,
            "timestamp": now,  
            "created_at": now,            
        }
        await readings.insert_one(doc)
        logger.info("Stored sensor reading in MongoDB for device %s", data.device_id)
    else:
        logger.info("Skipped storing reading for %s (within 15 min window)", data.device_id)

    return {"status": "success"}

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