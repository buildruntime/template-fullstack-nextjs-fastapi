import pytest
from httpx import AsyncClient

from tests.integration.conftest import PASSWORD, SignUp, bearer

pytestmark = [pytest.mark.anyio, pytest.mark.integration]


async def test_register_returns_a_working_session(client: AsyncClient) -> None:
    response = await client.post(
        "/v1/auth/register",
        json={"email": "Ada@Example.com", "name": " Ada Lovelace ", "password": PASSWORD},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["user"]["email"] == "ada@example.com"
    assert body["user"]["name"] == "Ada Lovelace"
    assert body["user"]["role"] == "user"
    assert "password_hash" not in body["user"]
    me = await client.get("/v1/users/me", headers=bearer(body["token"]))
    assert me.status_code == 200
    assert me.json()["id"] == body["user"]["id"]


async def test_register_rejects_a_duplicate_email(client: AsyncClient, sign_up: SignUp) -> None:
    await sign_up("ada@example.com")

    response = await client.post(
        "/v1/auth/register", json={"email": "ADA@example.com", "name": "Ada", "password": PASSWORD}
    )

    assert response.status_code == 409
    assert response.headers["content-type"] == "application/problem+json"
    assert response.json()["code"] == "email_taken"


@pytest.mark.parametrize(
    ("body", "location"),
    [
        ({"email": "not-an-email", "name": "Ada", "password": PASSWORD}, "body.email"),
        ({"email": "ada@example.com", "name": "Ada", "password": "short"}, "body.password"),
        ({"email": "ada@example.com", "name": "", "password": PASSWORD}, "body.name"),
        (
            {"email": "ada@example.com", "name": "Ada", "password": PASSWORD, "role": "admin"},
            "body.role",
        ),
    ],
)
async def test_register_validates_input(
    client: AsyncClient, body: dict[str, str], location: str
) -> None:
    response = await client.post("/v1/auth/register", json=body)

    assert response.status_code == 422
    assert [e["location"] for e in response.json()["errors"]] == [location]


async def test_login_and_logout(client: AsyncClient, sign_up: SignUp) -> None:
    await sign_up("ada@example.com")

    login = await client.post(
        "/v1/auth/login", json={"email": "ada@example.com", "password": PASSWORD}
    )
    assert login.status_code == 200
    token = login.json()["token"]

    logout = await client.post("/v1/auth/logout", headers=bearer(token))
    assert logout.status_code == 204
    after = await client.get("/v1/users/me", headers=bearer(token))
    assert after.status_code == 401


async def test_wrong_password_and_unknown_email_look_the_same(
    client: AsyncClient, sign_up: SignUp
) -> None:
    await sign_up("ada@example.com")

    wrong = await client.post(
        "/v1/auth/login", json={"email": "ada@example.com", "password": "wrong password"}
    )
    unknown = await client.post(
        "/v1/auth/login", json={"email": "nobody@example.com", "password": PASSWORD}
    )

    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json()["code"] == unknown.json()["code"] == "invalid_credentials"
    assert wrong.json()["detail"] == unknown.json()["detail"]
    assert wrong.headers["www-authenticate"] == "Bearer"


async def test_login_attempts_are_rate_limited_per_email(
    client: AsyncClient, sign_up: SignUp
) -> None:
    await sign_up("ada@example.com")
    attempt = {"email": "ada@example.com", "password": "wrong password"}

    statuses = [(await client.post("/v1/auth/login", json=attempt)).status_code for _ in range(4)]
    correct = await client.post("/v1/auth/login", json={**attempt, "password": PASSWORD})
    other = await client.post(
        "/v1/auth/login", json={"email": "grace@example.com", "password": "wrong password"}
    )

    assert statuses == [401, 401, 401, 429]  # The test settings allow 3 attempts.
    assert correct.status_code == 429  # Even the right password, until the window ends.
    assert int(correct.headers["retry-after"]) > 0
    assert other.status_code == 401  # Other accounts are not affected.


@pytest.mark.parametrize(
    "headers",
    [{}, {"Authorization": "Bearer not-a-token"}, {"Authorization": "Basic YWRhOnB3"}],
)
async def test_protected_routes_need_a_valid_token(
    client: AsyncClient, headers: dict[str, str]
) -> None:
    response = await client.get("/v1/users/me", headers=headers)

    assert response.status_code == 401
    assert response.json()["code"] == "unauthenticated"


async def test_responses_carry_request_ids_and_are_not_cached(client: AsyncClient) -> None:
    response = await client.get("/v1/users/me", headers={"X-Request-ID": "trace-123"})

    assert response.headers["x-request-id"] == "trace-123"
    assert response.json()["request_id"] == "trace-123"
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-content-type-options"] == "nosniff"
