from sqlalchemy.orm import Session

from voidtalk_api.core.exceptions import ResourceNotFound
from voidtalk_api.models.user import User
from voidtalk_api.repositories.users import UserRepository


class UserService:
    def __init__(self, db: Session):
        self.users = UserRepository(db)

    def get_user_by_username(self, username: str) -> User:
        user = self.users.get_by_username(username.strip())
        if user is None:
            raise ResourceNotFound("User not found.")

        return user
