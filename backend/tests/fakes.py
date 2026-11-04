"""In-memory implementations of the repository ports, for unit tests."""

from datetime import datetime
from uuid import UUID

from app.users.errors import EmailTaken
from app.users.models import SessionRow, UserRow


class InMemoryUserRepository:
    def __init__(self) -> None:
        self.users: dict[UUID, UserRow] = {}

    async def get(self, user_id: UUID) -> UserRow | None:
        return self.users.get(user_id)

    async def get_by_email(self, email: str) -> UserRow | None:
        return next((u for u in self.users.values() if u.email == email), None)

    async def add(self, user: UserRow) -> None:
        if await self.get_by_email(user.email):
            raise EmailTaken()
        self.users[user.id] = user

    async def save(self, user: UserRow) -> None:
        self.users[user.id] = user

    async def list_page(
        self, *, after: tuple[datetime, UUID] | None, limit: int, search: str | None
    ) -> list[UserRow]:
        users = sorted(self.users.values(), key=lambda u: (u.created_at, u.id), reverse=True)
        if after is not None:
            users = [u for u in users if (u.created_at, u.id) < after]
        if search:
            users = [u for u in users if search.lower() in f"{u.email} {u.name.lower()}"]
        return users[:limit]


class InMemorySessionRepository:
    def __init__(self, users: InMemoryUserRepository) -> None:
        self.sessions: dict[UUID, SessionRow] = {}
        self._users = users

    async def add(self, session: SessionRow) -> None:
        self.sessions[session.id] = session

    async def get_active(self, token_hash: str, now: datetime) -> tuple[SessionRow, UserRow] | None:
        for session in self.sessions.values():
            if session.token_hash == token_hash and session.expires_at > now:
                user = self._users.users[session.user_id]
                return session, user
        return None

    async def save(self, session: SessionRow) -> None:
        self.sessions[session.id] = session

    async def list_active(self, user_id: UUID, now: datetime) -> list[SessionRow]:
        return [s for s in self.sessions.values() if s.user_id == user_id and s.expires_at > now]

    async def delete(self, user_id: UUID, session_id: UUID) -> bool:
        session = self.sessions.get(session_id)
        if session is None or session.user_id != user_id:
            return False
        del self.sessions[session_id]
        return True

    async def delete_all(self, user_id: UUID, *, except_id: UUID | None = None) -> int:
        doomed = [
            s.id for s in self.sessions.values() if s.user_id == user_id and s.id != except_id
        ]
        for session_id in doomed:
            del self.sessions[session_id]
        return len(doomed)

    async def delete_expired(self, now: datetime) -> int:
        doomed = [s.id for s in self.sessions.values() if s.expires_at <= now]
        for session_id in doomed:
            del self.sessions[session_id]
        return len(doomed)


class FixedClock:
    def __init__(self, now: datetime) -> None:
        self.now = now

    def __call__(self) -> datetime:
        return self.now
