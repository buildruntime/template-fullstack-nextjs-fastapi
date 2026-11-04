from functools import lru_cache
from typing import Literal

from pydantic import Field, PostgresDsn, RedisDsn
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration, read from APP_* environment variables (and .env in development)."""

    model_config = SettingsConfigDict(env_prefix="APP_", env_file=".env", extra="ignore")

    environment: Literal["development", "test", "production"] = "development"
    database_url: PostgresDsn
    database_pool_size: int = Field(default=5, ge=1, le=50)

    # Optional. Without Redis, login rate limiting is disabled and a warning is logged.
    redis_url: RedisDsn | None = None

    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    log_format: Literal["json", "console"] = "json"

    session_ttl_hours: int = Field(default=168, ge=1, le=24 * 90)
    allow_registration: bool = True
    login_attempts_per_window: int = Field(default=10, ge=1)
    login_window_seconds: int = Field(default=900, ge=1)

    # Interactive API documentation at /docs. Off by default in production.
    docs_enabled: bool | None = None

    @property
    def show_docs(self) -> bool:
        if self.docs_enabled is not None:
            return self.docs_enabled
        return self.environment != "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
