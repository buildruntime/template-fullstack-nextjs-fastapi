import pytest
from fastapi import FastAPI
from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_account_service
from app.users.models import UserRow
from tests.integration.conftest import PASSWORD, SignUp, bearer

pytestmark = [pytest.mark.anyio, pytest.mark.integration]


async def make_admin(db: AsyncSession, email: str) -> None:
    await db.execute(update(UserRow).where(UserRow.email == email).values(role="admin"))


async def test_update_profile(client: AsyncClient, sign_up: SignUp) -> None:
    token = await sign_up()

    response = await client.patch("/v1/users/me", headers=bearer(token), json={"name": "Ada L."})

    assert response.status_code == 200
    assert response.json()["name"] == "Ada L."


async def test_users_cannot_change_their_own_role(client: AsyncClient, sign_up: SignUp) -> None:
    token = await sign_up()

    response = await client.patch(
        "/v1/users/me", headers=bearer(token), json={"name": "Ada", "role": "admin"}
    )

    assert response.status_code == 422


async def test_change_password_signs_out_other_sessions(
    client: AsyncClient, sign_up: SignUp
) -> None:
    current = await sign_up()
    other = (
        await client.post("/v1/auth/login", json={"email": "ada@example.com", "password": PASSWORD})
    ).json()["token"]

    response = await client.post(
        "/v1/users/me/password",
        headers=bearer(current),
        json={"current_password": PASSWORD, "new_password": "an entirely new passphrase"},
    )

    assert response.status_code == 200
    assert response.json() == {"signed_out_sessions": 1}
    assert (await client.get("/v1/users/me", headers=bearer(current))).status_code == 200
    assert (await client.get("/v1/users/me", headers=bearer(other))).status_code == 401


async def test_change_password_needs_the_current_password(
    client: AsyncClient, sign_up: SignUp
) -> None:
    token = await sign_up()

    response = await client.post(
        "/v1/users/me/password",
        headers=bearer(token),
        json={"current_password": "not it", "new_password": "an entirely new passphrase"},
    )

    assert response.status_code == 400
    assert response.json()["code"] == "incorrect_password"


async def test_list_and_revoke_sessions(client: AsyncClient, sign_up: SignUp) -> None:
    current = await sign_up()
    await client.post(
        "/v1/auth/login",
        json={"email": "ada@example.com", "password": PASSWORD},
        headers={"User-Agent": "Second device"},
    )

    sessions = (await client.get("/v1/users/me/sessions", headers=bearer(current))).json()
    assert len(sessions) == 2
    other = next(s for s in sessions if not s["current"])
    assert other["user_agent"] == "Second device"

    revoked = await client.delete(f"/v1/users/me/sessions/{other['id']}", headers=bearer(current))
    assert revoked.status_code == 204
    remaining = (await client.get("/v1/users/me/sessions", headers=bearer(current))).json()
    assert [s["current"] for s in remaining] == [True]


async def test_users_cannot_revoke_someone_elses_session(
    client: AsyncClient, sign_up: SignUp
) -> None:
    ada = await sign_up("ada@example.com")
    grace = await sign_up("grace@example.com", "Grace Hopper")
    grace_session = (await client.get("/v1/users/me/sessions", headers=bearer(grace))).json()[0]

    response = await client.delete(
        f"/v1/users/me/sessions/{grace_session['id']}", headers=bearer(ada)
    )

    assert response.status_code == 404
    assert (await client.get("/v1/users/me", headers=bearer(grace))).status_code == 200


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("GET", "/v1/users"),
        ("GET", "/v1/users/6a0d3c4e-2b1f-4f0e-9a51-3c1d2e7b9f10"),
        ("PATCH", "/v1/users/6a0d3c4e-2b1f-4f0e-9a51-3c1d2e7b9f10"),
    ],
)
async def test_admin_routes_are_forbidden_to_users(
    client: AsyncClient, sign_up: SignUp, method: str, path: str
) -> None:
    token = await sign_up()

    response = await client.request(method, path, headers=bearer(token), json={"role": "admin"})

    assert response.status_code == 403
    assert response.json()["code"] == "permission_denied"


async def test_admin_lists_and_searches_users(
    client: AsyncClient, sign_up: SignUp, db: AsyncSession
) -> None:
    admin = await sign_up("root@example.com", "Root")
    await make_admin(db, "root@example.com")
    for n in range(4):
        await sign_up(f"user{n}@example.com", f"User {n}")

    first = (await client.get("/v1/users?limit=3", headers=bearer(admin))).json()
    second = (
        await client.get(f"/v1/users?limit=3&cursor={first['next_cursor']}", headers=bearer(admin))
    ).json()
    found = (await client.get("/v1/users?search=USER2", headers=bearer(admin))).json()

    emails = [u["email"] for u in first["items"] + second["items"]]
    assert len(emails) == len(set(emails)) == 5
    assert second["next_cursor"] is None
    assert [u["email"] for u in found["items"]] == ["user2@example.com"]


async def test_search_treats_wildcards_literally(
    client: AsyncClient, sign_up: SignUp, db: AsyncSession
) -> None:
    admin = await sign_up("root@example.com", "Root")
    await make_admin(db, "root@example.com")

    found = (await client.get("/v1/users?search=%25", headers=bearer(admin))).json()

    assert found["items"] == []


async def test_admin_deactivation_signs_the_user_out(
    client: AsyncClient, sign_up: SignUp, db: AsyncSession
) -> None:
    admin = await sign_up("root@example.com", "Root")
    await make_admin(db, "root@example.com")
    ada = await sign_up("ada@example.com")
    ada_id = (await client.get("/v1/users/me", headers=bearer(ada))).json()["id"]

    response = await client.patch(
        f"/v1/users/{ada_id}", headers=bearer(admin), json={"is_active": False}
    )

    assert response.status_code == 200
    assert response.json()["is_active"] is False
    assert (await client.get("/v1/users/me", headers=bearer(ada))).status_code == 401
    login = await client.post(
        "/v1/auth/login", json={"email": "ada@example.com", "password": PASSWORD}
    )
    assert login.status_code == 403
    assert login.json()["code"] == "account_disabled"


async def test_admin_cannot_demote_themselves(
    client: AsyncClient, sign_up: SignUp, db: AsyncSession
) -> None:
    admin = await sign_up("root@example.com", "Root")
    await make_admin(db, "root@example.com")
    admin_id = (await client.get("/v1/users/me", headers=bearer(admin))).json()["id"]

    response = await client.patch(
        f"/v1/users/{admin_id}", headers=bearer(admin), json={"role": "user"}
    )

    assert response.status_code == 409
    assert response.json()["code"] == "cannot_modify_self"


async def test_unknown_user_is_not_found(
    client: AsyncClient, sign_up: SignUp, db: AsyncSession
) -> None:
    admin = await sign_up("root@example.com", "Root")
    await make_admin(db, "root@example.com")

    response = await client.get(
        "/v1/users/6a0d3c4e-2b1f-4f0e-9a51-3c1d2e7b9f10", headers=bearer(admin)
    )

    assert response.status_code == 404


async def test_unexpected_errors_do_not_leak_details(
    app: FastAPI, client: AsyncClient, sign_up: SignUp
) -> None:
    token = await sign_up()

    def broken() -> None:
        raise RuntimeError("connection to db-internal-7 refused")

    app.dependency_overrides[get_account_service] = broken
    response = await client.patch("/v1/users/me", headers=bearer(token), json={"name": "x"})

    assert response.status_code == 500
    assert response.json()["code"] == "internal_error"
    assert "db-internal-7" not in response.text
