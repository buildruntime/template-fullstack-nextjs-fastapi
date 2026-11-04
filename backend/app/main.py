import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.api import health
from app.api.middleware import RequestContextMiddleware
from app.api.problems import register_problem_handlers
from app.auth import router as auth
from app.core.config import Settings, get_settings
from app.core.logging import configure_logging
from app.core.rate_limit import RateLimiter
from app.db.session import create_engine
from app.users import router as users

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings: Settings = app.state.settings
    engine = create_engine(settings)
    app.state.sessionmaker = async_sessionmaker(engine, expire_on_commit=False)
    redis = (
        Redis.from_url(str(settings.redis_url), socket_timeout=2, socket_connect_timeout=2)
        if settings.redis_url
        else None
    )
    app.state.redis = redis
    app.state.rate_limiter = RateLimiter(redis)
    if redis is None:
        logger.warning("APP_REDIS_URL is not set: sign-in rate limiting is disabled")
    logger.info("API started", extra={"environment": settings.environment})
    try:
        yield
    finally:
        if redis is not None:
            await redis.aclose()
        await engine.dispose()


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.log_level, settings.log_format)
    app = FastAPI(
        title="Buildruntime starter API",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if settings.show_docs else None,
        redoc_url=None,
        openapi_url="/openapi.json" if settings.show_docs else None,
    )
    app.state.settings = settings
    register_problem_handlers(app)
    app.add_middleware(RequestContextMiddleware)
    app.include_router(health.router)
    app.include_router(auth.router, prefix="/v1")
    app.include_router(users.router, prefix="/v1")
    return app
