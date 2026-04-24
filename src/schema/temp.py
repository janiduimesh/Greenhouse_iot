from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from typing import List


class SensorData(BaseModel):
    device_id: str

    temperature: Optional[float] = None
    humidity: Optional[float] = None

    soil_moisture_value: Optional[int] = None
    soil_moisture_percentage: Optional[int] = None
    soil_status: Optional[str] = None

    light_value: Optional[int] = None
    light_status: Optional[str] = None

    co2_value: Optional[int] = None
    co2_status: Optional[str] = None

    servo_status: Optional[str] = None
    pump_status: Optional[str] = None
    fan_status: Optional[str] = None
    buzzer_status: Optional[str] = None

class SensorForecastPoint(BaseModel):
    timestamp: datetime
    temperature: float
    humidity: float
    soil_moisture_percentage: float
    light_value: float
    co2_value: float


class SensorPredictionResponse(BaseModel):
    success: bool
    message: str
    device_id: str | None = None
    generated_at: datetime | None = None
    forecast_horizon_hours: int | None = None
    forecast: List[SensorForecastPoint] = []