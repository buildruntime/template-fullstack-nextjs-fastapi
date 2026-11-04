from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, status

from app.api.deps import AccountServiceDep, AdminDep, AdminServiceDep, CurrentDep
from app.api.pagination import decode_cursor, encode_cursor
from app.users.schemas import (
    PasswordChange,
    PasswordChanged,
    ProfileUpdate,
    SessionOut,
    UserAdminUpdate,
    UserOut,
    UserPage,
)

router = APIRouter(prefix="/users", tags=["users"])


# The current user. These routes come first, so that "me" is never parsed as a user ID.


@router.get("/me")
async def get_me(current: CurrentDep) -> UserOut:
    return UserOut.model_validate(current.user)


@router.patch("/me")
async def update_me(
    body: ProfileUpdate, current: CurrentDep, account: AccountServiceDep
) -> UserOut:
    return UserOut.model_validate(await account.update_profile(current.user, name=body.name))


@router.post("/me/password")
async def change_password(
    body: PasswordChange, current: CurrentDep, account: AccountServiceDep
) -> PasswordChanged:
    """Change the password. Every other session is signed out."""
    ended = await account.change_password(
        current.user,
        current.session,
        current_password=body.current_password,
        new_password=body.new_password,
    )
    return PasswordChanged(signed_out_sessions=ended)


@router.get("/me/sessions")
async def list_my_sessions(current: CurrentDep, account: AccountServiceDep) -> list[SessionOut]:
    sessions = await account.list_sessions(current.user)
    return [
        SessionOut(
            id=s.id,
            user_agent=s.user_agent,
            created_at=s.created_at,
            last_used_at=s.last_used_at,
            expires_at=s.expires_at,
            current=s.id == current.session.id,
        )
        for s in sessions
    ]


@router.delete("/me/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_my_session(
    session_id: UUID, current: CurrentDep, account: AccountServiceDep
) -> None:
    await account.revoke_session(current.user, session_id)


# Administration. Every route depends on AdminDep, which requires the admin role.


@router.get("")
async def list_users(
    _: AdminDep,
    admin: AdminServiceDep,
    cursor: str | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    search: Annotated[str | None, Query(max_length=100)] = None,
) -> UserPage:
    after = decode_cursor(cursor) if cursor else None
    users = await admin.list_page(after=after, limit=limit + 1, search=search or None)
    page, more = users[:limit], len(users) > limit
    return UserPage(
        items=[UserOut.model_validate(u) for u in page],
        next_cursor=encode_cursor(page[-1].created_at, page[-1].id) if more else None,
    )


@router.get("/{user_id}")
async def get_user(user_id: UUID, _: AdminDep, admin: AdminServiceDep) -> UserOut:
    return UserOut.model_validate(await admin.get(user_id))


@router.patch("/{user_id}")
async def update_user(
    user_id: UUID, body: UserAdminUpdate, current: AdminDep, admin: AdminServiceDep
) -> UserOut:
    """Change a user's role or deactivate them. Deactivation signs out all their sessions."""
    user = await admin.update(current.user, user_id, role=body.role, is_active=body.is_active)
    return UserOut.model_validate(user)
