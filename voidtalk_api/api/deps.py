from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import HTTPBasic
from sqlalchemy.orm import Session

from voidtalk_api.core.database import get_db
from voidtalk_api.models.user import User
from voidtalk_api.services.auth import SESSION_COOKIE_NAME, AuthService


basic_auth = HTTPBasic(auto_error=False)


def get_current_user(
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
    db: Session = Depends(get_db),
) -> User:
    user = AuthService(db).get_user_by_session_token(session_token)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    return user
