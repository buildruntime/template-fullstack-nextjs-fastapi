import json
import logging
from datetime import UTC, datetime
from uuid import uuid4

import pytest

from app.api.pagination import InvalidCursor, decode_cursor, encode_cursor
from app.core.logging import JsonFormatter, request_id_var


def test_json_log_entries_include_the_request_id_and_extra_fields() -> None:
    record = logging.makeLogRecord(
        {"name": "app.test", "levelname": "INFO", "msg": "Signed in %s", "args": ("ada",)}
    )
    record.user_id = "42"
    token = request_id_var.set("abc123")
    try:
        entry = json.loads(JsonFormatter().format(record))
    finally:
        request_id_var.reset(token)

    assert entry["message"] == "Signed in ada"
    assert entry["level"] == "INFO"
    assert entry["request_id"] == "abc123"
    assert entry["user_id"] == "42"


def test_cursor_round_trip() -> None:
    position = (datetime(2026, 3, 12, 9, 41, 7, 123000, tzinfo=UTC), uuid4())

    cursor = encode_cursor(*position)

    assert "=" not in cursor
    assert decode_cursor(cursor) == position


@pytest.mark.parametrize("cursor", ["not-a-cursor", "e30", ""])
def test_invalid_cursors_are_rejected(cursor: str) -> None:
    with pytest.raises(InvalidCursor):
        decode_cursor(cursor)
