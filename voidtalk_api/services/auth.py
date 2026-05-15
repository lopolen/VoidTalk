from datetime import datetime, timedelta, timezone
import secrets

from sqlalchemy.orm import Session

from voidtalk_api.core.exceptions import (
    InvalidEmail,
    PasswordResetRequired,
    ResourceAlreadyExists,
)
from voidtalk_api.core.security import hash_password, validate_email_address, verify_password
from voidtalk_api.models.user import User, UserSession
from voidtalk_api.repositories.sessions import UserSessionRepository
from voidtalk_api.repositories.users import UserRepository
from voidtalk_api.schemas.user import UserRegister


SESSION_COOKIE_NAME = "voidtalk_session"
SESSION_EXPIRE_DAYS = 30
SESSION_COOKIE_MAX_AGE = SESSION_EXPIRE_DAYS * 24 * 60 * 60


class AuthService:
    def __init__(self, db: Session):
        self.users = UserRepository(db)
        self.sessions = UserSessionRepository(db)

    def register_user(self, user_data: UserRegister) -> User:
        username = user_data.username.strip()
        email = validate_email_address(str(user_data.email))

        existing_user = self.users.get_by_username_or_email(username, email)
        if existing_user is not None:
            raise ResourceAlreadyExists("User with this username or email already exists.")

        return self.users.create(
            username=username,
            email=email,
            password_hash=hash_password(user_data.password),
        )

    def authenticate_user(self, login: str, password: str) -> User | None:
        normalized_login = login.strip()
        email_login = self._normalize_email_login(normalized_login)

        user = self.users.get_by_login(normalized_login, email_login)
        if user is None:
            return None

        if user.password_hash is None:
            raise PasswordResetRequired("Password reset required.")

        if not verify_password(password, user.password_hash):
            return None

        return user

    def create_session(self, user: User) -> UserSession:
        session_token = secrets.token_urlsafe(48)
        expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_EXPIRE_DAYS)

        return self.sessions.create(
            user_id=user.id,
            session_token=session_token,
            expires_at=expires_at,
        )

    def get_user_by_session_token(self, session_token: str | None) -> User | None:
        if session_token is None:
            return None

        session = self.sessions.get_active_by_token(
            session_token=session_token,
            now=datetime.now(timezone.utc),
        )
        if session is None:
            return None

        return session.user

    def logout_user(self, session_token: str | None) -> bool:
        if session_token is None:
            return False

        return self.sessions.expire_by_token(
            session_token=session_token,
            now=datetime.now(timezone.utc),
        )

    def _normalize_email_login(self, login: str) -> str:
        try:
            return validate_email_address(login)
        except InvalidEmail:
            return login
