from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://username:password@localhost:5432/interview_db"

    # JWT
    SECRET_KEY: str = "your-secret-key-here-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Gemini API
    GEMINI_API_KEY: str = ""

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # WebSocket
    WEBSOCKET_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Email Configuration
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = ""
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_FROM_NAME: str = "AI Interview Assistant"

    # Cloudinary Configuration
    CLOUDINARY_CLOUD_NAME: str = "drrwu3h46"
    CLOUDINARY_API_KEY: str = "255559542354973"
    CLOUDINARY_API_SECRET: str = "yZMqUlw2_mOtRYAjtWBGLtblGCU"

    class Config:
        env_file = ".env"

settings = Settings()