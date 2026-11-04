from collections.abc import AsyncIterator

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine

from app.core.config import Settings


def create_engine(settings: Settings) -> AsyncEngine:
    return create_async_engine(
        str(settings.database_url),
        pool_size=settings.database_pool_size,
        pool_pre_ping=True,
    )


async def get_session(request: Request) -> AsyncIterator[AsyncSession]:
    """One transaction per request: commit on success, roll back on any exception.

    Declare it with Depends(get_session, scope="function") so that the commit happens before
    the response is sent. With FastAPI's default scope, a failed commit would follow a
    successful response.
    """
    async with request.app.state.sessionmaker() as session, session.begin():
        yield session
