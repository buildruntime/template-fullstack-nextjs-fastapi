import base64
import binascii
import json
from datetime import datetime
from uuid import UUID

from app.core.errors import InvalidInput


class InvalidCursor(InvalidInput):
    code = "invalid_cursor"

    def __init__(self) -> None:
        super().__init__("The cursor is not valid. Start again without a cursor.")


def encode_cursor(created_at: datetime, id: UUID) -> str:
    raw = json.dumps({"t": created_at.isoformat(), "id": str(id)}).encode()
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def decode_cursor(cursor: str) -> tuple[datetime, UUID]:
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        data = json.loads(base64.urlsafe_b64decode(padded))
        return datetime.fromisoformat(data["t"]), UUID(data["id"])
    except (binascii.Error, ValueError, KeyError, TypeError) as exc:
        raise InvalidCursor() from exc
