from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timezone
import logging

from schema.temp import SensorPredictionResponse
from jobs.predict_sensor_model import predict_sensor_forecast
from utils.database import get_database

router = APIRouter()
logger = logging.getLogger(__name__)

GREENHOUSE_DEVICE_IDS = ["greenhouse_node_1"]


@router.get("/predict-sensors", response_model=SensorPredictionResponse)
async def predict_sensors(
    device_id: str = Query(..., description="Greenhouse device id (e.g. greenhouse_node_1)")
):
    if device_id not in GREENHOUSE_DEVICE_IDS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid device_id. Use one of: {GREENHOUSE_DEVICE_IDS}"
        )

    try:
        result = await predict_sensor_forecast(device_id=device_id)

        db = get_database()
        predictions = db["sensor_predictions"]

        await predictions.update_one(
            {"device_id": device_id},
            {
                "$set": {
                    "device_id": result["device_id"],
                    "generated_at": result["generated_at"],
                    "forecast_horizon_hours": result["forecast_horizon_hours"],
                    "forecast": result["forecast"],
                    "updated_at": datetime.now(timezone.utc),
                }
            },
            upsert=True
        )
        logger.info("Saved prediction to DB for device %s", device_id)

        return SensorPredictionResponse(
            success=True,
            message="6-hour sensor forecast generated successfully",
            device_id=result["device_id"],
            generated_at=result["generated_at"],
            forecast_horizon_hours=result["forecast_horizon_hours"],
            forecast=result["forecast"]
        )

    except FileNotFoundError as e:
        logger.error("Model file error: %s", str(e))
        return SensorPredictionResponse(
            success=False,
            message=f"Prediction model not available for {device_id}. Please train the models first."
        )

    except ValueError as e:
        logger.error("Prediction validation error: %s", str(e))
        return SensorPredictionResponse(
            success=False,
            message=str(e)
        )

    except Exception as e:
        logger.error("Prediction error: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))