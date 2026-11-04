from uuid import uuid4

import pytest

from app.users.errors import CannotModifySelf, IncorrectPassword, SessionNotFound, UserNotFound
from app.users.models import Role
from app.users.service import AccountService, AuthService, IssuedSession, UserAdminService
from tests.fakes import InMemorySessionRepository

pytestmark = pytest.mark.anyio
PASSWORD = "correct horse battery"


async def register(auth: AuthService, email: str) -> IssuedSession:
    return await auth.register(email=email, name="Someone", password=PASSWORD, user_agent=None)


async def test_change_password_signs_out_other_sessions_only(
    auth: AuthService, account: AccountService, sessions: InMemorySessionRepository
) -> None:
    current = await register(auth, "ada@example.com")
    await auth.login(email="ada@example.com", password=PASSWORD, user_agent=None)
    await auth.login(email="ada@example.com", password=PASSWORD, user_agent=None)

    ended = await account.change_password(
        current.user,
        current.session,
        current_password=PASSWORD,
        new_password="a different passphrase",
    )

    assert ended == 2
    assert list(sessions.sessions) == [current.session.id]
    await auth.login(email="ada@example.com", password="a different passphrase", user_agent=None)


async def test_change_password_requires_the_current_password(
    auth: AuthService, account: AccountService
) -> None:
    current = await register(auth, "ada@example.com")

    with pytest.raises(IncorrectPassword):
        await account.change_password(
            current.user, current.session, current_password="wrong", new_password="whatever123456"
        )


async def test_users_can_revoke_only_their_own_sessions(
    auth: AuthService, account: AccountService
) -> None:
    ada = await register(auth, "ada@example.com")
    grace = await register(auth, "grace@example.com")

    with pytest.raises(SessionNotFound):
        await account.revoke_session(ada.user, grace.session.id)

    await account.revoke_session(ada.user, ada.session.id)
    assert await account.list_sessions(ada.user) == []


async def test_admin_can_change_roles_and_deactivate(
    auth: AuthService, admin: UserAdminService, sessions: InMemorySessionRepository
) -> None:
    root = await register(auth, "root@example.com")
    ada = await register(auth, "ada@example.com")

    promoted = await admin.update(root.user, ada.user.id, role=Role.ADMIN, is_active=None)
    assert promoted.role == "admin"

    deactivated = await admin.update(root.user, ada.user.id, role=None, is_active=False)
    assert not deactivated.is_active
    assert await sessions.list_active(ada.user.id, ada.session.created_at) == []


@pytest.mark.parametrize(
    ("role", "is_active"), [(Role.USER, None), (None, False), (Role.USER, False)]
)
async def test_admins_cannot_demote_or_deactivate_themselves(
    auth: AuthService, admin: UserAdminService, role: Role | None, is_active: bool | None
) -> None:
    root = await register(auth, "root@example.com")
    root.user.role = Role.ADMIN.value

    with pytest.raises(CannotModifySelf):
        await admin.update(root.user, root.user.id, role=role, is_active=is_active)


async def test_admins_may_save_their_own_unchanged_role(
    auth: AuthService, admin: UserAdminService
) -> None:
    root = await register(auth, "root@example.com")
    root.user.role = Role.ADMIN.value

    updated = await admin.update(root.user, root.user.id, role=Role.ADMIN, is_active=True)

    assert updated.role == "admin"


async def test_unknown_user_is_not_found(auth: AuthService, admin: UserAdminService) -> None:
    root = await register(auth, "root@example.com")

    with pytest.raises(UserNotFound):
        await admin.get(uuid4())
    with pytest.raises(UserNotFound):
        await admin.update(root.user, uuid4(), role=Role.ADMIN, is_active=None)
