from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timedelta, timezone
from utils.database import get_database
from typing import List, Dict, Any
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

GREENHOUSE_DEVICE_IDS = ["greenhouse_node_1"]

@router.get("/sensor-data/history-all")
async def get_sensor_history_all(
    device_id: str = Query(...),
    days: int = Query(...)
):
    """Returns raw time-series data for ALL sensors to build comparative Analytics charts."""
    if device_id not in GREENHOUSE_DEVICE_IDS:
        raise HTTPException(status_code=400, detail="Invalid device_id")

    try:
        db = get_database()
        collection = db["latest_sensor_readings"]

        start_date = datetime.now(timezone.utc) - timedelta(days=days)

        cursor = collection.find(
            {
                "device_id": device_id,
                "timestamp": {"$gte": start_date}
            },
            {
                "_id": 0,
                "timestamp": 1,
                "temperature": 1,
                "humidity": 1,
                "soil_moisture_percentage": 1,
                "light_value": 1,
                "co2_value": 1
            }
        ).sort("timestamp", 1)

        data = await cursor.to_list(length=10000)

        # Ensure the frontend always receives an array, even if empty
        return {
            "success": True,
            "days": days,
            "count": len(data),
            "data": data
        }

    except Exception as e:
        logger.error(f"Error fetching all history data: {e}")
        raise HTTPException(status_code=500, detail=str(e))
