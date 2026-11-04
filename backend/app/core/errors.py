"""Expected failures. They carry a stable code and no HTTP knowledge; app.api.problems maps them."""


class DomainError(Exception):
    code = "domain_error"

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class NotFound(DomainError):
    code = "not_found"


class Conflict(DomainError):
    code = "conflict"


class PermissionDenied(DomainError):
    code = "permission_denied"


class Unauthenticated(DomainError):
    code = "unauthenticated"


class InvalidInput(DomainError):
    code = "invalid_input"


class RateLimited(DomainError):
    code = "rate_limited"

    def __init__(self, message: str, retry_after: int) -> None:
        super().__init__(message)
        self.retry_after = retry_after
