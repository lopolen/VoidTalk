from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from voidtalk_api.core.database import get_db
from voidtalk_api.core.exceptions import (
    InvalidEmail,
    PasswordResetRequired,
    ResourceAlreadyExists,
    ResourceNotFound,
)
from voidtalk_api.api.deps import get_current_user
from voidtalk_api.models.user import User
from voidtalk_api.schemas.user import (
    UserLogin,
    UserOptionalInfoRead,
    UserOptionalInfoReplace,
    UserPublicProfileRead,
    UserPublicRead,
    UserRead,
    UserRegister,
)
from voidtalk_api.services.auth import (
    SESSION_COOKIE_MAX_AGE,
    SESSION_COOKIE_NAME,
    AuthService,
)
from voidtalk_api.services.user_optional_info import UserOptionalInfoService
from voidtalk_api.services.users import UserService


router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/me/optional-info", response_model=UserOptionalInfoRead)
def get_my_optional_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return UserOptionalInfoService(db).get_current_user_optional_info(current_user)


@router.put("/me/optional-info", response_model=UserOptionalInfoRead)
def replace_my_optional_info(
    optional_info_data: UserOptionalInfoReplace,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return UserOptionalInfoService(db).replace_current_user_optional_info(
        optional_info_data,
        current_user,
    )


@router.get("/search/{username}", response_model=UserPublicRead)
def search_user_by_username(username: str, db: Session = Depends(get_db)):
    try:
        return UserService(db).get_user_by_username(username)
    except ResourceNotFound as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.get("/profiles/{username}", response_model=UserPublicProfileRead)
def get_public_profile_by_username(username: str, db: Session = Depends(get_db)):
    try:
        return UserService(db).get_user_by_username(username)
    except ResourceNotFound as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


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
def login_user(
    credentials: UserLogin,
    response: Response,
    db: Session = Depends(get_db),
):
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

    session = auth_service.create_session(user)
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session.session_token,
        max_age=SESSION_COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
    )

    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout_user(
    response: Response,
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
    db: Session = Depends(get_db),
):
    auth_service = AuthService(db)
    auth_service.logout_user(session_token)
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        httponly=True,
        samesite="lax",
    )
