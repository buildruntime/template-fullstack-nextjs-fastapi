from app.core.errors import Conflict, InvalidInput, NotFound, PermissionDenied, Unauthenticated


class EmailTaken(Conflict):
    code = "email_taken"

    def __init__(self) -> None:
        super().__init__("An account with this email address already exists.")


class UserNotFound(NotFound):
    def __init__(self) -> None:
        super().__init__("No user has this ID.")


class SessionNotFound(NotFound):
    def __init__(self) -> None:
        super().__init__("No active session has this ID.")


class InvalidCredentials(Unauthenticated):
    code = "invalid_credentials"

    def __init__(self) -> None:
        super().__init__("The email address or password is incorrect.")


class AccountDisabled(PermissionDenied):
    code = "account_disabled"

    def __init__(self) -> None:
        super().__init__("This account has been deactivated. Contact an administrator.")


class RegistrationClosed(PermissionDenied):
    code = "registration_closed"

    def __init__(self) -> None:
        super().__init__("New accounts cannot be created at the moment.")


class IncorrectPassword(InvalidInput):
    code = "incorrect_password"

    def __init__(self) -> None:
        super().__init__("The current password is incorrect.")


class WeakPassword(InvalidInput):
    code = "weak_password"


class CannotModifySelf(Conflict):
    code = "cannot_modify_self"

    def __init__(self) -> None:
        super().__init__("You cannot change your own role or deactivate your own account.")
