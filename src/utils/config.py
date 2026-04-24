from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent.parent

class Settings(BaseSettings):
    app_name: str = "Greenhouse IoT API"
    debug: bool = False
    api_host: str = "0.0.0.0"
    api_port: int = 8002


    mongodb_url: str
    mongodb_db_name: str

    jwt_secret_key: str = "greenhouse-iot-secret-change-me"
    jwt_expiry_minutes: int = 1440  # 24 hours

    gemini_api_key: Optional[str] = None

    groq_api_key: Optional[str] = None
        
    class Config:
        env_file = str(ROOT_DIR / ".env")  
        env_file_encoding = 'utf-8'
        protected_namespaces = ('settings_',)  

settings = Settings()

def get_settings():
    return Settings()
