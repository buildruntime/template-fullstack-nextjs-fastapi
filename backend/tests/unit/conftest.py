from datetime import UTC, datetime, timedelta

import pytest

from app.users.service import AccountService, AuthService, UserAdminService
from tests.fakes import FixedClock, InMemorySessionRepository, InMemoryUserRepository

SESSION_TTL = timedelta(days=7)


@pytest.fixture
def clock() -> FixedClock:
    return FixedClock(datetime(2026, 3, 12, 9, 0, tzinfo=UTC))


@pytest.fixture
def users() -> InMemoryUserRepository:
    return InMemoryUserRepository()


@pytest.fixture
def sessions(users: InMemoryUserRepository) -> InMemorySessionRepository:
    return InMemorySessionRepository(users)


@pytest.fixture
def auth(
    users: InMemoryUserRepository, sessions: InMemorySessionRepository, clock: FixedClock
) -> AuthService:
    return AuthService(
        users, sessions, session_ttl=SESSION_TTL, allow_registration=True, clock=clock
    )


@pytest.fixture
def account(
    users: InMemoryUserRepository, sessions: InMemorySessionRepository, clock: FixedClock
) -> AccountService:
    return AccountService(users, sessions, clock=clock)


@pytest.fixture
def admin(
    users: InMemoryUserRepository, sessions: InMemorySessionRepository, clock: FixedClock
) -> UserAdminService:
    return UserAdminService(users, sessions, clock=clock)
