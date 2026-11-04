import logging
from typing import Literal

from fastapi import APIRouter, Request, Response, status
from pydantic import BaseModel
from sqlalchemy import text

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/health", tags=["health"])

CheckState = Literal["ok", "unavailable", "not_configured"]


class Readiness(BaseModel):
    status: Literal["ok", "unavailable"]
    checks: dict[str, CheckState]


@router.get("/live")
async def live() -> dict[str, str]:
    """The process is running. Never checks dependencies."""
    return {"status": "ok"}


@router.get("/ready")
async def ready(request: Request, response: Response) -> Readiness:
    """The instance can serve traffic: the database answers, and Redis if it is configured."""
    checks: dict[str, CheckState] = {}
    try:
        async with request.app.state.sessionmaker() as session:
            await session.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:
        logger.warning("Readiness check failed: database", exc_info=True)
        checks["database"] = "unavailable"
    redis = request.app.state.redis
    if redis is None:
        checks["redis"] = "not_configured"
    else:
        try:
            await redis.ping()
            checks["redis"] = "ok"
        except Exception:
            logger.warning("Readiness check failed: redis", exc_info=True)
            checks["redis"] = "unavailable"
    healthy = "unavailable" not in checks.values()
    if not healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return Readiness(status="ok" if healthy else "unavailable", checks=checks)
