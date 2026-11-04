from app.core.security import (
    hash_password,
    hash_session_token,
    new_session_token,
    password_needs_rehash,
    verify_password,
)


def test_password_hash_is_argon2id_and_verifies() -> None:
    hashed = hash_password("correct horse battery")

    assert hashed.startswith("$argon2id$")
    assert verify_password(hashed, "correct horse battery")
    assert not password_needs_rehash(hashed)


def test_wrong_password_does_not_verify() -> None:
    assert not verify_password(hash_password("correct horse battery"), "wrong horse battery")


def test_missing_or_malformed_hash_does_not_verify() -> None:
    assert not verify_password(None, "anything at all")
    assert not verify_password("not-a-hash", "anything at all")


def test_hashes_are_salted() -> None:
    assert hash_password("same password!") != hash_password("same password!")


def test_session_tokens_are_unique_and_only_their_hash_is_stable() -> None:
    first, second = new_session_token(), new_session_token()

    assert first != second
    assert len(first) >= 43  # 32 random bytes, URL-safe Base64.
    assert hash_session_token(first) == hash_session_token(first)
    assert hash_session_token(first) != first
    assert len(hash_session_token(first)) == 64
