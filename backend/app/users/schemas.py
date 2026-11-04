from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints

from app.users.models import Role

# NIST SP 800-63B: a minimum length, a generous maximum, and no composition rules.
# The maximum bounds the cost of hashing a submitted password.
NewPassword = Annotated[str, StringConstraints(min_length=12, max_length=128)]
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class Request(BaseModel):
    model_config = ConfigDict(extra="forbid")


class RegisterRequest(Request):
    email: EmailStr = Field(max_length=320)
    name: Name
    password: NewPassword


class LoginRequest(Request):
    email: EmailStr = Field(max_length=320)
    password: str = Field(min_length=1, max_length=128)


class ProfileUpdate(Request):
    name: Name


class PasswordChange(Request):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: NewPassword


class UserAdminUpdate(Request):
    role: Role | None = None
    is_active: bool | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    name: str
    role: Role
    is_active: bool
    created_at: datetime
    last_login_at: datetime | None


class UserPage(BaseModel):
    items: list[UserOut]
    next_cursor: str | None


class IssuedSessionOut(BaseModel):
    token: str = Field(description="Send as 'Authorization: Bearer <token>'. Shown only once.")
    expires_at: datetime
    user: UserOut


class SessionOut(BaseModel):
    id: UUID
    user_agent: str | None
    created_at: datetime
    last_used_at: datetime
    expires_at: datetime
    current: bool


class PasswordChanged(BaseModel):
    signed_out_sessions: int
