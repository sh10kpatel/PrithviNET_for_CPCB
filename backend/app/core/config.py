from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql://prithvinet:prithvinet123@localhost:5432/prithvinet"
    jwt_secret: str = "prithvinet-dev-secret-key-2026"
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 60 * 24  # 24 hours
    gemini_api_key: str = ""
    backend_url: str = "http://localhost:8000"
    frontend_url: str = "http://localhost:3000"

    class Config:
        env_file = "../.env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
