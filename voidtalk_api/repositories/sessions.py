from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from voidtalk_api.models.user import UserSession


class UserSessionRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        user_id: int,
        session_token: str,
        expires_at: datetime,
    ) -> UserSession:
        session = UserSession(
            user_id=user_id,
            session_token=session_token,
            expires_at=expires_at,
        )

        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def get_active_by_token(
        self,
        session_token: str,
        now: datetime,
    ) -> UserSession | None:
        return self.db.scalar(
            select(UserSession).where(
                UserSession.session_token == session_token,
                UserSession.expires_at > now,
            )
        )
