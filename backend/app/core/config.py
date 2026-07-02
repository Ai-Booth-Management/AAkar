from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    NEO4J_URI: str
    NEO4J_USERNAME: str
    NEO4J_PASSWORD: str
    OLLAMA_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5:7b"

    # JWT / Auth
    JWT_SECRET_KEY: str  # No default — must be set in .env
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15  # 15 min access token

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000"  # comma-separated origins

    # WhatsApp
    WHATSAPP_TOKEN: str
    WHATSAPP_PHONE_NUMBER_ID: str
    WHATSAPP_VERIFY_TOKEN: str

    # NewsAPI
    NEWSAPI_KEY: str = ""

    # Database
    DATABASE_URL: str = "sqlite:///./data/app.db"

    # LiveKit
    LIVEKIT_ENABLED: str = "False"
    LIVEKIT_URL: str = ""
    LIVEKIT_API_KEY: str = ""
    LIVEKIT_API_SECRET: str = ""

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent.parent.parent / ".env",
        extra="ignore"
    )


settings = Settings()
