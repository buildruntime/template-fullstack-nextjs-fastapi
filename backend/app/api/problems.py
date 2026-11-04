"""Error responses in the Problem Details format (RFC 9457)."""

import logging
from http import HTTPStatus
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException
from starlette.responses import Response

from app.core.errors import (
    Conflict,
    DomainError,
    InvalidInput,
    NotFound,
    PermissionDenied,
    RateLimited,
    Unauthenticated,
)

logger = logging.getLogger(__name__)

# Checked in order: put subclasses before their base classes.
STATUS_FOR_ERROR: list[tuple[type[DomainError], HTTPStatus]] = [
    (NotFound, HTTPStatus.NOT_FOUND),
    (Conflict, HTTPStatus.CONFLICT),
    (Unauthenticated, HTTPStatus.UNAUTHORIZED),
    (PermissionDenied, HTTPStatus.FORBIDDEN),
    (RateLimited, HTTPStatus.TOO_MANY_REQUESTS),
    (InvalidInput, HTTPStatus.BAD_REQUEST),
]


def problem(
    request: Request,
    status: HTTPStatus,
    detail: str,
    code: str,
    *,
    headers: dict[str, str] | None = None,
    **extra: Any,
) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "")
    body = {
        "type": "about:blank",
        "title": status.phrase,
        "status": status.value,
        "detail": detail,
        "code": code,
        "request_id": request_id,
        **extra,
    }
    return JSONResponse(
        body,
        status_code=status.value,
        media_type="application/problem+json",
        headers={"X-Request-ID": request_id, "Cache-Control": "no-store", **(headers or {})},
    )


async def handle_domain_error(request: Request, exc: Exception) -> Response:
    assert isinstance(exc, DomainError)  # noqa: S101  # Registered for DomainError only.
    status = next(
        (status for cls, status in STATUS_FOR_ERROR if isinstance(exc, cls)),
        HTTPStatus.BAD_REQUEST,
    )
    headers: dict[str, str] = {}
    if isinstance(exc, RateLimited):
        headers["Retry-After"] = str(exc.retry_after)
    if isinstance(exc, Unauthenticated):
        headers["WWW-Authenticate"] = "Bearer"
    logger.info("Request failed", extra={"error_code": exc.code, "status": status.value})
    return problem(request, status, exc.message, exc.code, headers=headers)


async def handle_validation_error(request: Request, exc: Exception) -> Response:
    assert isinstance(exc, RequestValidationError)  # noqa: S101
    errors = [
        {"location": ".".join(str(part) for part in error["loc"]), "message": error["msg"]}
        for error in exc.errors()
    ]
    return problem(
        request,
        HTTPStatus.UNPROCESSABLE_CONTENT,
        "The request is not valid. See errors for details.",
        "validation_failed",
        errors=errors,
    )


async def handle_http_exception(request: Request, exc: Exception) -> Response:
    """Unknown routes and methods, and HTTPException raised by FastAPI itself."""
    assert isinstance(exc, HTTPException)  # noqa: S101
    status = HTTPStatus(exc.status_code)
    headers = dict(exc.headers) if exc.headers else None
    return problem(request, status, str(exc.detail), status.name.lower(), headers=headers)


async def handle_unexpected_error(request: Request, exc: Exception) -> Response:
    logger.exception("Unhandled error")
    return problem(
        request,
        HTTPStatus.INTERNAL_SERVER_ERROR,
        "Something went wrong on our side. The error has been logged.",
        "internal_error",
    )


def register_problem_handlers(app: FastAPI) -> None:
    app.add_exception_handler(DomainError, handle_domain_error)
    app.add_exception_handler(RequestValidationError, handle_validation_error)
    app.add_exception_handler(HTTPException, handle_http_exception)
    app.add_exception_handler(Exception, handle_unexpected_error)
