from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from voidtalk_api.core.database import get_db
from voidtalk_api.core.exceptions import (
    InvalidEmail,
    PasswordResetRequired,
    ResourceAlreadyExists,
)
from voidtalk_api.schemas.user import UserLogin, UserRead, UserRegister
from voidtalk_api.services.auth import AuthService


router = APIRouter(prefix="/users", tags=["users"])


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
)
def register_user(user_data: UserRegister, db: Session = Depends(get_db)):
    auth_service = AuthService(db)

    try:
        return auth_service.register_user(user_data)
    except InvalidEmail as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid email address.",
        ) from exc
    except ResourceAlreadyExists as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


@router.post("/login", response_model=UserRead)
def login_user(credentials: UserLogin, db: Session = Depends(get_db)):
    auth_service = AuthService(db)

    try:
        user = auth_service.authenticate_user(
            credentials.login,
            credentials.password,
        )
    except PasswordResetRequired as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Password reset required.",
        ) from exc

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid login or password.",
        )

    return user
