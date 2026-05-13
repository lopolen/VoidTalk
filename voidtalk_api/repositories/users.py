from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from voidtalk_api.core.exceptions import ResourceAlreadyExists
from voidtalk_api.models.user import User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_username_or_email(self, username: str, email: str) -> User | None:
        return self.db.scalar(
            select(User).where(or_(User.username == username, User.email == email))
        )

    def get_by_login(self, username: str, email: str) -> User | None:
        return self.get_by_username_or_email(username, email)

    def create(self, username: str, email: str, password_hash: str) -> User:
        user = User(username=username, email=email, password_hash=password_hash)

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
