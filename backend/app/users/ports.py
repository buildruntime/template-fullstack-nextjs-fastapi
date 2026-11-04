"""What the user services need from storage. SQL implementations are in repository.py."""

from datetime import datetime
from typing import Protocol
from uuid import UUID

from app.users.models import SessionRow, UserRow


class UserRepository(Protocol):
    async def get(self, user_id: UUID) -> UserRow | None: ...

    async def get_by_email(self, email: str) -> UserRow | None: ...

    async def add(self, user: UserRow) -> None:
        """Store a new user. Raises EmailTaken if the email address is in use."""
        ...

    async def save(self, user: UserRow) -> None: ...

    async def list_page(
        self, *, after: tuple[datetime, UUID] | None, limit: int, search: str | None
    ) -> list[UserRow]:
        """Users newest first, starting after the given position."""
        ...


class SessionRepository(Protocol):
    async def add(self, session: SessionRow) -> None: ...

    async def get_active(self, token_hash: str, now: datetime) -> tuple[SessionRow, UserRow] | None:
        """The unexpired session with this token hash, and its user."""
        ...

    async def save(self, session: SessionRow) -> None: ...

    async def list_active(self, user_id: UUID, now: datetime) -> list[SessionRow]: ...

    async def delete(self, user_id: UUID, session_id: UUID) -> bool:
        """Delete one of the user's sessions. False if it did not exist."""
        ...

    async def delete_all(self, user_id: UUID, *, except_id: UUID | None = None) -> int: ...

    async def delete_expired(self, now: datetime) -> int: ...
