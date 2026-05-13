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
