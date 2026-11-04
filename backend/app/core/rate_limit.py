"""Fixed-window rate limiting in Redis. Used to slow down password guessing."""

import logging
import time
from dataclasses import dataclass

from redis.asyncio import Redis
from redis.exceptions import RedisError

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class RateLimitResult:
    allowed: bool
    remaining: int
    retry_after: int


class RateLimiter:
    def __init__(self, redis: Redis | None, *, prefix: str = "starter:rate") -> None:
        self._redis = redis
        self._prefix = prefix

    async def hit(self, key: str, *, limit: int, window_seconds: int) -> RateLimitResult:
        """Count one attempt for key. Without Redis, or if Redis fails, every attempt is allowed."""
        if self._redis is None:
            return RateLimitResult(allowed=True, remaining=limit, retry_after=0)
        now = int(time.time())
        window_key = f"{self._prefix}:{key}:{now // window_seconds}"
        try:
            async with self._redis.pipeline(transaction=True) as pipe:
                pipe.incr(window_key)
                pipe.expire(window_key, window_seconds, nx=True)
                count, _ = await pipe.execute()
        except RedisError:
            # Failing open keeps sign-in working during a Redis outage. The error is logged.
            logger.exception("Rate limiter unavailable", extra={"rate_limit_key": key})
            return RateLimitResult(allowed=True, remaining=limit, retry_after=0)
        allowed = count <= limit
        return RateLimitResult(
            allowed=allowed,
            remaining=max(limit - count, 0),
            retry_after=0 if allowed else window_seconds - now % window_seconds,
        )
