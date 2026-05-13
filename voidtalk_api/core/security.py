import uuid

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHash

from email_validator import validate_email, EmailNotValidError
from voidtalk_api.core.exceptions import InvalidEmail, PasswordResetRequired


ph = PasswordHasher()


def hash_password(password: str) -> str:
    return ph.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    try:
        return ph.verify(password_hash, plain_password)
    except VerifyMismatchError:
        return False
    except (VerificationError, InvalidHash):
        raise PasswordResetRequired("Password reset required due to invalid password state.")


def validate_email_address(email: str) -> str:
    try:
        valid = validate_email(email, check_deliverability=False)
        return valid.email
    except EmailNotValidError:
        raise InvalidEmail
    

def generate_short_unique_str() -> str:
    return str(uuid.uuid4()).split('-')[0]
