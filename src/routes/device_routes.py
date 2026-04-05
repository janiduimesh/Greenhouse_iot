from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timezone
import logging
from utils.database import get_database

router = APIRouter()
logger = logging.getLogger(__name__)

# Valid actuators the ESP32 can control
VALID_ACTUATORS = {
    "pump":   {"label": "Water Pump",       "icon": "💧"},
    "fan":    {"label": "Ventilation Fan",   "icon": "🌀"},
    "servo":  {"label": "Window Servo",      "icon": "🪟"},
    "buzzer": {"label": "Alert Buzzer",      "icon": "🔔"},
    "light":  {"label": "Grow Light",        "icon": "💡"},
}

VALID_ACTIONS = ["on", "off"]


@router.post("/device/command")
async def send_command(
    device_id: str = Query(default="greenhouse_node_1"),
    actuator: str = Query(..., description="Actuator name: pump, fan, servo, buzzer, light"),
    action: str = Query(..., description="Action: on or off"),
):
    """
    Queue a command for the ESP32 to pick up.
    The device polls /device/commands/pending every few seconds.
    """
    if actuator not in VALID_ACTUATORS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid actuator '{actuator}'. Valid: {list(VALID_ACTUATORS.keys())}",
        )

    if action not in VALID_ACTIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid action '{action}'. Valid: {VALID_ACTIONS}",
        )

    db = get_database()
    commands = db["device_commands"]

    now = datetime.now(timezone.utc)
    doc = {
        "device_id": device_id,
        "actuator": actuator,
        "action": action,
        "status": "pending",   # pending → acknowledged → executed
        "created_at": now,
        "updated_at": now,
    }

    result = await commands.insert_one(doc)

    logger.info(
        "Command queued: device=%s actuator=%s action=%s id=%s",
        device_id, actuator, action, result.inserted_id,
    )

    return {
        "success": True,
        "command_id": str(result.inserted_id),
        "device_id": device_id,
        "actuator": actuator,
        "action": action,
        "status": "pending",
    }


@router.get("/device/commands/pending")
async def get_pending_commands(
    device_id: str = Query(default="greenhouse_node_1"),
):
    """
    ESP32 polls this endpoint every few seconds.
    Returns all pending commands and marks them as 'acknowledged'.
    """
    db = get_database()
    commands = db["device_commands"]

    cursor = commands.find({
        "device_id": device_id,
        "status": "pending",
    }).sort("created_at", 1)

    pending = await cursor.to_list(length=20)

    # Mark all as acknowledged
    if pending:
        ids = [doc["_id"] for doc in pending]
        await commands.update_many(
            {"_id": {"$in": ids}},
            {"$set": {
                "status": "acknowledged",
                "updated_at": datetime.now(timezone.utc),
            }},
        )

    return {
        "commands": [
            {
                "id": str(doc["_id"]),
                "actuator": doc["actuator"],
                "action": doc["action"],
            }
            for doc in pending
        ]
    }


@router.get("/device/status")
async def get_device_status(
    device_id: str = Query(default="greenhouse_node_1"),
):
    """
    Get the latest known status of all actuators for a device.
    Reads from the latest sensor reading which includes actuator statuses.
    """
    db = get_database()

    # Get latest sensor data which contains actuator statuses
    latest = await db["latest_sensor_readings"].find_one(
        {"device_id": device_id},
        sort=[("timestamp", -1)],
    )

    # Get any pending commands (not yet picked up by device)
    pending_cursor = db["device_commands"].find({
        "device_id": device_id,
        "status": "pending",
    })
    pending = await pending_cursor.to_list(length=20)
    pending_actuators = {doc["actuator"]: doc["action"] for doc in pending}

    statuses = {}
    for key, info in VALID_ACTUATORS.items():
        # Actual status from device
        device_key = f"{key}_status"
        actual = latest.get(device_key, "unknown") if latest else "unknown"

        # Normalize: some statuses may be "ON"/"OFF" vs "on"/"off"
        if isinstance(actual, str):
            actual = actual.lower()

        statuses[key] = {
            "label": info["label"],
            "icon": info["icon"],
            "status": actual,
            "pending_action": pending_actuators.get(key),
        }

    return {
        "success": True,
        "device_id": device_id,
        "actuators": statuses,
        "last_update": latest["timestamp"].isoformat() if latest and "timestamp" in latest else None,
    }
