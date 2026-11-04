from typing import Any

import pytest
from httpx import AsyncClient
from redis.asyncio import Redis

from app.core.rate_limit import RateLimiter

pytestmark = [pytest.mark.anyio, pytest.mark.integration]


async def test_liveness(client: AsyncClient) -> None:
    response = await client.get("/health/live")

    assert response.json() == {"status": "ok"}


async def test_readiness_checks_database_and_redis(client: AsyncClient) -> None:
    response = await client.get("/health/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "checks": {"database": "ok", "redis": "ok"}}


async def test_unknown_routes_return_problem_details(client: AsyncClient) -> None:
    response = await client.get("/v1/nothing-here")

    assert response.status_code == 404
    assert response.headers["content-type"] == "application/problem+json"
    assert response.json()["code"] == "not_found"


async def test_rate_limiter_counts_per_window(
    redis: Redis, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr("app.core.rate_limit.time.time", lambda: 999_980.0)  # 20 s into a minute.
    limiter = RateLimiter(redis, prefix="test:unit")

    results = [await limiter.hit("k", limit=2, window_seconds=60) for _ in range(3)]

    assert [r.allowed for r in results] == [True, True, False]
    assert results[-1].retry_after == 40
    assert await redis.ttl("test:unit:k:16666") > 0  # Every window key expires.


async def test_rate_limiter_without_redis_allows_everything() -> None:
    limiter = RateLimiter(None)

    result = await limiter.hit("k", limit=1, window_seconds=60)

    assert result.allowed


async def test_rate_limiter_fails_open_when_redis_is_down(caplog: Any) -> None:
    unreachable = Redis.from_url("redis://127.0.0.1:1/0", socket_connect_timeout=0.2)
    limiter = RateLimiter(unreachable)

    result = await limiter.hit("k", limit=1, window_seconds=60)

    assert result.allowed
    assert "Rate limiter unavailable" in caplog.text
    await unreachable.aclose()
