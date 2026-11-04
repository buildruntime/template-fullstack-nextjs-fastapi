"""Administrative commands.

    python -m app.cli create-user --email ada@example.com --name "Ada" --role admin
    python -m app.cli prune-sessions

create-user asks for the password, or reads it from standard input with --password-stdin.
"""

import argparse
import asyncio
import getpass
import sys
from datetime import timedelta

from pydantic import TypeAdapter, ValidationError
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.config import get_settings
from app.core.errors import DomainError
from app.db.session import create_engine
from app.users.models import Role
from app.users.repository import SqlSessionRepository, SqlUserRepository
from app.users.schemas import NewPassword, RegisterRequest
from app.users.service import AuthService, utc_now


def _read_password(from_stdin: bool) -> str:
    if from_stdin:
        return sys.stdin.readline().rstrip("\n")
    password = getpass.getpass("Password: ")
    if password != getpass.getpass("Repeat password: "):
        raise SystemExit("The passwords do not match.")
    return password


async def create_user(email: str, name: str, role: Role, password: str) -> None:
    RegisterRequest(email=email, name=name, password=password)  # Same validation as the API.
    engine = create_engine(get_settings())
    try:
        async with async_sessionmaker(engine, expire_on_commit=False)() as session, session.begin():
            users, sessions = SqlUserRepository(session), SqlSessionRepository(session)
            auth = AuthService(
                users, sessions, session_ttl=timedelta(minutes=1), allow_registration=True
            )
            # Created through the same path as a registration, so the same rules apply.
            issued = await auth.register(email=email, name=name, password=password, user_agent=None)
            await sessions.delete_all(issued.user.id)  # A CLI-created account needs no session.
            issued.user.role = role.value
            issued.user.last_login_at = None
            await users.save(issued.user)
        print(f"Created {role.value} {issued.user.email} ({issued.user.id})")
    finally:
        await engine.dispose()


async def prune_sessions() -> None:
    engine = create_engine(get_settings())
    try:
        async with async_sessionmaker(engine, expire_on_commit=False)() as session, session.begin():
            removed = await SqlSessionRepository(session).delete_expired(utc_now())
        print(f"Removed {removed} expired sessions")
    finally:
        await engine.dispose()


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    commands = parser.add_subparsers(dest="command", required=True)
    create = commands.add_parser("create-user", help="Create a user, for example the first admin")
    create.add_argument("--email", required=True)
    create.add_argument("--name", required=True)
    create.add_argument("--role", choices=[r.value for r in Role], default=Role.USER.value)
    create.add_argument(
        "--password-stdin", action="store_true", help="Read the password from stdin"
    )
    commands.add_parser("prune-sessions", help="Delete expired sessions")
    args = parser.parse_args(argv)

    try:
        if args.command == "create-user":
            password = _read_password(args.password_stdin)
            TypeAdapter(NewPassword).validate_python(password)
            asyncio.run(create_user(args.email, args.name, Role(args.role), password))
        else:
            asyncio.run(prune_sessions())
    except ValidationError as exc:
        raise SystemExit(f"Invalid input: {exc.errors()[0]['msg']}") from None
    except DomainError as exc:
        raise SystemExit(exc.message) from None


if __name__ == "__main__":
    main()
