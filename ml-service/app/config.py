"""PrithviNET ML Service configuration."""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application settings loaded from environment variables."""

    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    DB_PATH: str = os.getenv("DB_PATH", "../backend/data/prithvinet.db")
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    @property
    def db_absolute_path(self) -> str:
        """Resolve DB_PATH relative to the ml-service directory."""
        return str(Path(__file__).parent.parent / self.DB_PATH)


settings = Settings()
