# config.py
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    OPENAI_API_KEY: str
    MODEL_NAME: str = "gpt-4o"
    SERVICE_VERSION: str = "1.0.0"
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()