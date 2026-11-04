from datetime import timedelta

import pytest

from app.users.errors import (
    AccountDisabled,
    EmailTaken,
    InvalidCredentials,
    RegistrationClosed,
    WeakPassword,
)
from app.users.service import AuthService
from tests.fakes import FixedClock, InMemorySessionRepository, InMemoryUserRepository
from tests.unit.conftest import SESSION_TTL

pytestmark = pytest.mark.anyio
PASSWORD = "correct horse battery"


async def test_register_normalises_the_email_and_signs_in(
    auth: AuthService, clock: FixedClock
) -> None:
    issued = await auth.register(
        email="  Ada@Example.COM ", name="Ada", password=PASSWORD, user_agent="Firefox"
    )

    assert issued.user.email == "ada@example.com"
    assert issued.user.role == "user"
    assert issued.session.expires_at == clock.now + SESSION_TTL
    assert issued.session.user_agent == "Firefox"
    assert issued.session.token_hash != issued.token


async def test_register_rejects_an_email_in_use(auth: AuthService) -> None:
    await auth.register(email="ada@example.com", name="Ada", password=PASSWORD, user_agent=None)

    with pytest.raises(EmailTaken):
        await auth.register(email="ADA@example.com", name="Ada", password=PASSWORD, user_agent=None)


async def test_register_can_be_closed(
    users: InMemoryUserRepository, sessions: InMemorySessionRepository
) -> None:
    closed = AuthService(users, sessions, session_ttl=SESSION_TTL, allow_registration=False)

    with pytest.raises(RegistrationClosed):
        await closed.register(email="a@example.com", name="A", password=PASSWORD, user_agent=None)


@pytest.mark.parametrize("password", ["ada.lovelace@example.com", "my-ada.lovelace-pass"])
async def test_register_rejects_passwords_built_from_the_email(
    auth: AuthService, password: str
) -> None:
    with pytest.raises(WeakPassword):
        await auth.register(
            email="ada.lovelace@example.com", name="Ada", password=password, user_agent=None
        )


async def test_login_issues_a_new_session(auth: AuthService, clock: FixedClock) -> None:
    registered = await auth.register(
        email="ada@example.com", name="Ada", password=PASSWORD, user_agent=None
    )
    clock.now += timedelta(hours=2)

    issued = await auth.login(email="ADA@example.com", password=PASSWORD, user_agent=None)

    assert issued.user.id == registered.user.id
    assert issued.token != registered.token
    assert issued.user.last_login_at == clock.now


@pytest.mark.parametrize(
    ("email", "password"),
    [("ada@example.com", "wrong password!"), ("nobody@example.com", PASSWORD)],
)
async def test_login_fails_the_same_way_for_a_wrong_password_or_unknown_email(
    auth: AuthService, email: str, password: str
) -> None:
    await auth.register(email="ada@example.com", name="Ada", password=PASSWORD, user_agent=None)

    with pytest.raises(InvalidCredentials):
        await auth.login(email=email, password=password, user_agent=None)


async def test_login_is_refused_for_a_deactivated_account(auth: AuthService) -> None:
    issued = await auth.register(
        email="ada@example.com", name="Ada", password=PASSWORD, user_agent=None
    )
    issued.user.is_active = False

    with pytest.raises(AccountDisabled):
        await auth.login(email="ada@example.com", password=PASSWORD, user_agent=None)


async def test_authenticate_accepts_a_valid_token_only(auth: AuthService) -> None:
    issued = await auth.register(
        email="ada@example.com", name="Ada", password=PASSWORD, user_agent=None
    )

    found = await auth.authenticate(issued.token)

    assert found is not None
    assert found[0].id == issued.user.id
    assert await auth.authenticate("not-a-real-token") is None


async def test_authenticate_rejects_expired_sessions(auth: AuthService, clock: FixedClock) -> None:
    issued = await auth.register(
        email="ada@example.com", name="Ada", password=PASSWORD, user_agent=None
    )
    clock.now += SESSION_TTL

    assert await auth.authenticate(issued.token) is None


async def test_authenticate_rejects_deactivated_users(auth: AuthService) -> None:
    issued = await auth.register(
        email="ada@example.com", name="Ada", password=PASSWORD, user_agent=None
    )
    issued.user.is_active = False

    assert await auth.authenticate(issued.token) is None


async def test_authenticate_records_activity_at_most_once_a_minute(
    auth: AuthService, clock: FixedClock
) -> None:
    issued = await auth.register(
        email="ada@example.com", name="Ada", password=PASSWORD, user_agent=None
    )
    created = issued.session.last_used_at

    clock.now += timedelta(seconds=30)
    await auth.authenticate(issued.token)
    assert issued.session.last_used_at == created

    clock.now += timedelta(minutes=1)
    await auth.authenticate(issued.token)
    assert issued.session.last_used_at == clock.now


async def test_logout_ends_only_the_current_session(
    auth: AuthService, sessions: InMemorySessionRepository
) -> None:
    first = await auth.register(
        email="ada@example.com", name="Ada", password=PASSWORD, user_agent=None
    )
    second = await auth.login(email="ada@example.com", password=PASSWORD, user_agent=None)

    await auth.logout(first.user, first.session)

    assert await auth.authenticate(first.token) is None
    assert await auth.authenticate(second.token) is not None
    assert len(sessions.sessions) == 1
