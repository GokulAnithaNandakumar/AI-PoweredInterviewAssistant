from pydantic_settings import BaseSettings
from typing import List, Union
import json
import os

class Settings(BaseSettings):
    # Server Configuration
    PORT: int = 8000

    # Database
    DATABASE_URL: str = "postgresql://username:password@localhost:5432/interview_db"

    # JWT
    SECRET_KEY: str = "your-secret-key-here-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Gemini API
    GEMINI_API_KEY: str = ""

    # CORS - Handle both string and list formats
    CORS_ORIGINS: Union[str, List[str]] = "https://ai-powered-interview-assistant-chi.vercel.app,https://ai-powered-interview-assistant-chi.vercel.app"

    # WebSocket
    WEBSOCKET_ORIGINS: Union[str, List[str]] = "https://ai-powered-interview-assistant-chi.vercel.app,https://ai-powered-interview-assistant-chi.vercel.app"

    # Email Configuration - SMTP Fallback
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = ""
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_FROM_NAME: str = "AI Interview Assistant"
    
    # Resend Configuration (Primary)
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "onboarding@resend.dev"

    # Cloudinary Configuration
    CLOUDINARY_CLOUD_NAME: str = "drrwu3h46"
    CLOUDINARY_API_KEY: str = "255559542354973"
    CLOUDINARY_API_SECRET: str = "yZMqUlw2_mOtRYAjtWBGLtblGCU"

    def get_cors_origins(self) -> List[str]:
        """Parse CORS origins from string or list format"""
        if isinstance(self.CORS_ORIGINS, str):
            return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        return self.CORS_ORIGINS

    def get_websocket_origins(self) -> List[str]:
        """Parse WebSocket origins from string or list format"""
        if isinstance(self.WEBSOCKET_ORIGINS, str):
            return [origin.strip() for origin in self.WEBSOCKET_ORIGINS.split(",") if origin.strip()]
        return self.WEBSOCKET_ORIGINS

    class Config:
        env_file = ".env"

settings = Settings()