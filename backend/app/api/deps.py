"""Dependencies shared by the routers: the database session, services, and the current user."""

from dataclasses import dataclass
from datetime import timedelta
from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.errors import PermissionDenied, Unauthenticated
from app.core.rate_limit import RateLimiter
from app.db.session import get_session
from app.users.models import Role, SessionRow, UserRow
from app.users.repository import SqlSessionRepository, SqlUserRepository
from app.users.service import AccountService, AuthService, UserAdminService

# scope="function": commit before the response is sent (see app.db.session).
DbSession = Annotated[AsyncSession, Depends(get_session, scope="function")]


def get_settings_dep(request: Request) -> Settings:
    settings: Settings = request.app.state.settings
    return settings


SettingsDep = Annotated[Settings, Depends(get_settings_dep)]


def get_rate_limiter(request: Request) -> RateLimiter:
    limiter: RateLimiter = request.app.state.rate_limiter
    return limiter


RateLimiterDep = Annotated[RateLimiter, Depends(get_rate_limiter)]


def get_auth_service(db: DbSession, settings: SettingsDep) -> AuthService:
    return AuthService(
        SqlUserRepository(db),
        SqlSessionRepository(db),
        session_ttl=timedelta(hours=settings.session_ttl_hours),
        allow_registration=settings.allow_registration,
    )


def get_account_service(db: DbSession) -> AccountService:
    return AccountService(SqlUserRepository(db), SqlSessionRepository(db))


def get_admin_service(db: DbSession) -> UserAdminService:
    return UserAdminService(SqlUserRepository(db), SqlSessionRepository(db))


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]
AccountServiceDep = Annotated[AccountService, Depends(get_account_service)]
AdminServiceDep = Annotated[UserAdminService, Depends(get_admin_service)]

_bearer = HTTPBearer(auto_error=False, description="The session token from sign-in.")


@dataclass(frozen=True, slots=True)
class Current:
    user: UserRow
    session: SessionRow


async def get_current(
    request: Request,
    auth: AuthServiceDep,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> Current:
    if credentials is None:
        raise Unauthenticated("Sign in to continue.")
    found = await auth.authenticate(credentials.credentials)
    if found is None:
        raise Unauthenticated("Your session has expired or was signed out. Sign in again.")
    user, session = found
    request.state.user_id = str(user.id)  # Included in the access log.
    return Current(user=user, session=session)


CurrentDep = Annotated[Current, Depends(get_current)]


async def require_admin(current: CurrentDep) -> Current:
    if current.user.role != Role.ADMIN:
        raise PermissionDenied("This action needs the admin role.")
    return current


AdminDep = Annotated[Current, Depends(require_admin)]
