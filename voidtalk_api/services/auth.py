from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from voidtalk_api.core.exceptions import (
    InvalidEmail,
    PasswordResetRequired,
    ResourceAlreadyExists,
)
from voidtalk_api.core.security import hash_password, validate_email_address, verify_password
from voidtalk_api.models.user import User
from voidtalk_api.schemas.user import UserRegister


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def register_user(self, user_data: UserRegister) -> User:
        username = user_data.username.strip()
        email = validate_email_address(str(user_data.email))

        existing_user = self.db.scalar(
            select(User).where(or_(User.username == username, User.email == email))
        )
        if existing_user is not None:
            raise ResourceAlreadyExists("User with this username or email already exists.")

        user = User(
            username=username,
            email=email,
            password_hash=hash_password(user_data.password),
        )

        self.db.add(user)
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise ResourceAlreadyExists(
                "User with this username or email already exists."
            ) from exc

        self.db.refresh(user)
        return user

    def authenticate_user(self, login: str, password: str) -> User | None:
        normalized_login = login.strip()
        email_login = self._normalize_email_login(normalized_login)

        user = self.db.scalar(
            select(User).where(
                or_(User.username == normalized_login, User.email == email_login)
            )
        )
        if user is None:
            return None

        if user.password_hash is None:
            raise PasswordResetRequired("Password reset required.")

        if not verify_password(password, user.password_hash):
            return None

        return user

    def _normalize_email_login(self, login: str) -> str:
        try:
            return validate_email_address(login)
        except InvalidEmail:
            return login
