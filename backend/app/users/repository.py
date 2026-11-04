from datetime import datetime
from uuid import UUID

from sqlalchemy import delete, func, or_, select, tuple_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.users.errors import EmailTaken
from app.users.models import SessionRow, UserRow


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


class SqlUserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, user_id: UUID) -> UserRow | None:
        return await self._session.get(UserRow, user_id)

    async def get_by_email(self, email: str) -> UserRow | None:
        return await self._session.scalar(select(UserRow).where(UserRow.email == email))

    async def add(self, user: UserRow) -> None:
        # A savepoint keeps the request's transaction usable if the insert violates the
        # unique constraint. In PostgreSQL, a failed statement otherwise aborts the transaction.
        try:
            async with self._session.begin_nested():
                self._session.add(user)
        except IntegrityError as exc:
            if "uq_users_email" in str(exc.orig):
                raise EmailTaken() from exc
            raise

    async def save(self, user: UserRow) -> None:
        await self._session.flush()

    async def list_page(
        self, *, after: tuple[datetime, UUID] | None, limit: int, search: str | None
    ) -> list[UserRow]:
        query = select(UserRow).order_by(UserRow.created_at.desc(), UserRow.id.desc()).limit(limit)
        if after is not None:
            query = query.where(tuple_(UserRow.created_at, UserRow.id) < tuple_(*after))
        if search:
            pattern = f"%{_escape_like(search.lower())}%"
            query = query.where(
                or_(UserRow.email.like(pattern), func.lower(UserRow.name).like(pattern))
            )
        return list(await self._session.scalars(query))


class SqlSessionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, session: SessionRow) -> None:
        self._session.add(session)
        await self._session.flush()

    async def get_active(self, token_hash: str, now: datetime) -> tuple[SessionRow, UserRow] | None:
        row = (
            await self._session.execute(
                select(SessionRow, UserRow)
                .join(UserRow, UserRow.id == SessionRow.user_id)
                .where(SessionRow.token_hash == token_hash, SessionRow.expires_at > now)
            )
        ).first()
        return (row[0], row[1]) if row else None

    async def save(self, session: SessionRow) -> None:
        await self._session.flush()

    async def list_active(self, user_id: UUID, now: datetime) -> list[SessionRow]:
        query = (
            select(SessionRow)
            .where(SessionRow.user_id == user_id, SessionRow.expires_at > now)
            .order_by(SessionRow.last_used_at.desc())
        )
        return list(await self._session.scalars(query))

    async def delete(self, user_id: UUID, session_id: UUID) -> bool:
        result = await self._session.execute(
            delete(SessionRow).where(SessionRow.id == session_id, SessionRow.user_id == user_id)
        )
        return bool(getattr(result, "rowcount", 0))

    async def delete_all(self, user_id: UUID, *, except_id: UUID | None = None) -> int:
        query = delete(SessionRow).where(SessionRow.user_id == user_id)
        if except_id is not None:
            query = query.where(SessionRow.id != except_id)
        result = await self._session.execute(query)
        return int(getattr(result, "rowcount", 0))

    async def delete_expired(self, now: datetime) -> int:
        result = await self._session.execute(delete(SessionRow).where(SessionRow.expires_at <= now))
        return int(getattr(result, "rowcount", 0))
