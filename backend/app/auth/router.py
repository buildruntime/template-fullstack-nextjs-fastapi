from typing import Annotated

from fastapi import APIRouter, Header, status

from app.api.deps import AuthServiceDep, CurrentDep, RateLimiterDep, SettingsDep
from app.core.errors import RateLimited
from app.users.schemas import IssuedSessionOut, LoginRequest, RegisterRequest, UserOut
from app.users.service import IssuedSession, normalise_email

router = APIRouter(prefix="/auth", tags=["auth"])

UserAgent = Annotated[str | None, Header()]


def _out(issued: IssuedSession) -> IssuedSessionOut:
    return IssuedSessionOut(
        token=issued.token,
        expires_at=issued.session.expires_at,
        user=UserOut.model_validate(issued.user),
    )


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest, auth: AuthServiceDep, user_agent: UserAgent = None
) -> IssuedSessionOut:
    """Create an account and sign in to it."""
    issued = await auth.register(
        email=body.email, name=body.name, password=body.password, user_agent=user_agent
    )
    return _out(issued)


@router.post("/login")
async def login(
    body: LoginRequest,
    auth: AuthServiceDep,
    limiter: RateLimiterDep,
    settings: SettingsDep,
    user_agent: UserAgent = None,
) -> IssuedSessionOut:
    """Sign in. Attempts are limited per email address, to slow down password guessing."""
    result = await limiter.hit(
        f"login:{normalise_email(body.email)}",
        limit=settings.login_attempts_per_window,
        window_seconds=settings.login_window_seconds,
    )
    if not result.allowed:
        raise RateLimited(
            "Too many sign-in attempts for this account. Try again later.", result.retry_after
        )
    issued = await auth.login(email=body.email, password=body.password, user_agent=user_agent)
    return _out(issued)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(current: CurrentDep, auth: AuthServiceDep) -> None:
    """End the current session."""
    await auth.logout(current.user, current.session)
