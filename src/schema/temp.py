from datetime import date
from pydantic import BaseModel, Field
from typing import Optional, List

class SensorData(BaseModel):
    device_id: str
    temperature: float
    humidity: float
    timestamp: str