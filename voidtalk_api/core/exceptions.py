class InvalidEmail(Exception):
    """Exception raised when an email address is invalid"""
    pass

class UserAlreadyExists(Exception):
    """User with this email already exists"""
    pass

class PasswordResetRequired(Exception):
    """Exception raised when a password reset is required"""
    pass

class ResourceAlreadyExists(Exception):
    """Resource with this unique field already exists"""
    pass

class ResourceNotFound(Exception):
    """Requested resource does not exist"""
    pass

class PermissionDenied(Exception):
    """User is not allowed to perform this action"""
    pass


class AntiSpamRejected(Exception):
    """Post was rejected by anti-spam rules"""

    def __init__(
        self,
        message: str,
        status_code: int = 400,
        retry_after_seconds: int | None = None,
    ):
        super().__init__(message)
        self.status_code = status_code
        self.retry_after_seconds = retry_after_seconds
