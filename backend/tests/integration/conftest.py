"""Fixtures for tests against real PostgreSQL and Redis.

Set APP_TEST_DATABASE_URL and APP_TEST_REDIS_URL to point at a database and Redis database
that may be wiped. Each test runs in a transaction that is rolled back afterwards.
"""

import os
from collections.abc import AsyncIterator, Awaitable, Callable

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import (
    AsyncConnection,
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import Settings
from app.core.rate_limit import RateLimiter
from app.db.base import Base
from app.db.session import get_session
from app.main import create_app

PASSWORD = "correct horse battery"


@pytest.fixture(scope="session")
def settings() -> Settings:
    return Settings(
        environment="test",
        database_url=os.environ.get(
            "APP_TEST_DATABASE_URL",
            "postgresql+asyncpg://postgres:postgres@localhost:5432/starter_test",
        ),
        redis_url=os.environ.get("APP_TEST_REDIS_URL", "redis://localhost:6379/15"),
        log_format="console",
        login_attempts_per_window=3,
    )


@pytest.fixture(scope="session")
async def engine(settings: Settings) -> AsyncIterator[AsyncEngine]:
    engine = create_async_engine(str(settings.database_url))
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest.fixture
async def connection(engine: AsyncEngine) -> AsyncIterator[AsyncConnection]:
    async with engine.connect() as connection:
        transaction = await connection.begin()
        yield connection
        await transaction.rollback()


@pytest.fixture
async def db(connection: AsyncConnection) -> AsyncIterator[AsyncSession]:
    async with AsyncSession(
        bind=connection, join_transaction_mode="create_savepoint", expire_on_commit=False
    ) as session:
        yield session


@pytest.fixture
async def redis(settings: Settings) -> AsyncIterator[Redis]:
    client = Redis.from_url(str(settings.redis_url))
    await client.flushdb()
    yield client
    await client.flushdb()
    await client.aclose()


@pytest.fixture
def app(settings: Settings, engine: AsyncEngine, db: AsyncSession, redis: Redis) -> FastAPI:
    app = create_app(settings)
    # The test transport does not run the lifespan, so provide what it would have created.
    app.state.sessionmaker = async_sessionmaker(engine, expire_on_commit=False)
    app.state.redis = redis
    app.state.rate_limiter = RateLimiter(redis, prefix="test:rate")

    async def override_get_session() -> AsyncIterator[AsyncSession]:
        async with db.begin_nested():
            yield db

    app.dependency_overrides[get_session] = override_get_session
    return app


@pytest.fixture
async def client(app: FastAPI) -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


SignUp = Callable[..., Awaitable[str]]


@pytest.fixture
def sign_up(client: AsyncClient) -> SignUp:
    """Register a user through the API and return their session token."""

    async def sign_up(email: str = "ada@example.com", name: str = "Ada Lovelace") -> str:
        response = await client.post(
            "/v1/auth/register", json={"email": email, "name": name, "password": PASSWORD}
        )
        assert response.status_code == 201, response.text
        token: str = response.json()["token"]
        return token

    return sign_up


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}
