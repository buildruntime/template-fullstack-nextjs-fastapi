"""Use cases for authentication, self-service account management and user administration."""

from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from app.core.security import (
    hash_password,
    hash_session_token,
    new_session_token,
    password_needs_rehash,
    verify_password,
)
from app.users.errors import (
    AccountDisabled,
    CannotModifySelf,
    IncorrectPassword,
    InvalidCredentials,
    RegistrationClosed,
    SessionNotFound,
    UserNotFound,
    WeakPassword,
)
from app.users.models import Role, SessionRow, UserRow
from app.users.ports import SessionRepository, UserRepository


def utc_now() -> datetime:
    return datetime.now(UTC)


def normalise_email(email: str) -> str:
    return email.strip().lower()


def check_password_policy(password: str, *, email: str, name: str) -> None:
    """Length is enforced by the request schema. This rejects passwords built from the account."""
    lowered = password.lower()
    local_part = email.split("@", 1)[0].lower()
    if lowered in {email.lower(), local_part, name.lower()} or (
        len(local_part) >= 4 and local_part in lowered
    ):
        raise WeakPassword("Choose a password that does not contain your email address or name.")


@dataclass(frozen=True, slots=True)
class IssuedSession:
    token: str
    session: SessionRow
    user: UserRow


class AuthService:
    def __init__(
        self,
        users: UserRepository,
        sessions: SessionRepository,
        *,
        session_ttl: timedelta,
        allow_registration: bool,
        clock: Callable[[], datetime] = utc_now,
    ) -> None:
        self._users = users
        self._sessions = sessions
        self._session_ttl = session_ttl
        self._allow_registration = allow_registration
        self._clock = clock

    async def register(
        self, *, email: str, name: str, password: str, user_agent: str | None
    ) -> IssuedSession:
        if not self._allow_registration:
            raise RegistrationClosed()
        email = normalise_email(email)
        check_password_policy(password, email=email, name=name)
        now = self._clock()
        user = UserRow(
            id=uuid4(),
            email=email,
            name=name,
            password_hash=hash_password(password),
            role=Role.USER.value,
            is_active=True,
            created_at=now,
            updated_at=now,
            last_login_at=now,
        )
        await self._users.add(user)
        return await self._issue(user, user_agent)

    async def login(self, *, email: str, password: str, user_agent: str | None) -> IssuedSession:
        user = await self._users.get_by_email(normalise_email(email))
        # verify_password checks a dummy hash when user is None, so both paths take as long.
        if not verify_password(user.password_hash if user else None, password) or user is None:
            raise InvalidCredentials()
        if not user.is_active:
            raise AccountDisabled()
        if password_needs_rehash(user.password_hash):
            user.password_hash = hash_password(password)
        user.last_login_at = self._clock()
        await self._users.save(user)
        return await self._issue(user, user_agent)

    async def authenticate(self, token: str) -> tuple[UserRow, SessionRow] | None:
        """The user and session for a token, or None if it is unknown, expired or disabled."""
        now = self._clock()
        found = await self._sessions.get_active(hash_session_token(token), now)
        if found is None:
            return None
        session, user = found
        if not user.is_active:
            return None
        # Record activity at most once a minute, to avoid a write on every request.
        if now - session.last_used_at > timedelta(minutes=1):
            session.last_used_at = now
            await self._sessions.save(session)
        return user, session

    async def logout(self, user: UserRow, session: SessionRow) -> None:
        await self._sessions.delete(user.id, session.id)

    async def _issue(self, user: UserRow, user_agent: str | None) -> IssuedSession:
        now = self._clock()
        token = new_session_token()
        session = SessionRow(
            id=uuid4(),
            user_id=user.id,
            token_hash=hash_session_token(token),
            user_agent=(user_agent or "")[:255] or None,
            created_at=now,
            last_used_at=now,
            expires_at=now + self._session_ttl,
        )
        await self._sessions.add(session)
        return IssuedSession(token=token, session=session, user=user)


class AccountService:
    """What signed-in users can do to their own account."""

    def __init__(
        self,
        users: UserRepository,
        sessions: SessionRepository,
        clock: Callable[[], datetime] = utc_now,
    ) -> None:
        self._users = users
        self._sessions = sessions
        self._clock = clock

    async def update_profile(self, user: UserRow, *, name: str) -> UserRow:
        user.name = name
        user.updated_at = self._clock()
        await self._users.save(user)
        return user

    async def change_password(
        self, user: UserRow, current: SessionRow, *, current_password: str, new_password: str
    ) -> int:
        """Change the password and sign out every other session. Returns how many were ended."""
        if not verify_password(user.password_hash, current_password):
            raise IncorrectPassword()
        check_password_policy(new_password, email=user.email, name=user.name)
        user.password_hash = hash_password(new_password)
        user.updated_at = self._clock()
        await self._users.save(user)
        return await self._sessions.delete_all(user.id, except_id=current.id)

    async def list_sessions(self, user: UserRow) -> list[SessionRow]:
        return await self._sessions.list_active(user.id, self._clock())

    async def revoke_session(self, user: UserRow, session_id: UUID) -> None:
        if not await self._sessions.delete(user.id, session_id):
            raise SessionNotFound()


class UserAdminService:
    """User management for administrators. Callers must check the admin role first."""

    def __init__(
        self,
        users: UserRepository,
        sessions: SessionRepository,
        clock: Callable[[], datetime] = utc_now,
    ) -> None:
        self._users = users
        self._sessions = sessions
        self._clock = clock

    async def list_page(
        self, *, after: tuple[datetime, UUID] | None, limit: int, search: str | None
    ) -> list[UserRow]:
        return await self._users.list_page(after=after, limit=limit, search=search)

    async def get(self, user_id: UUID) -> UserRow:
        user = await self._users.get(user_id)
        if user is None:
            raise UserNotFound()
        return user

    async def update(
        self, actor: UserRow, user_id: UUID, *, role: Role | None, is_active: bool | None
    ) -> UserRow:
        user = await self.get(user_id)
        # An administrator who demotes or deactivates themselves could lock everyone out.
        if user.id == actor.id and (
            (role is not None and role != user.role) or (is_active is False)
        ):
            raise CannotModifySelf()
        if role is not None:
            user.role = role.value
        if is_active is not None:
            user.is_active = is_active
        user.updated_at = self._clock()
        await self._users.save(user)
        if is_active is False:
            await self._sessions.delete_all(user.id)
        return user
