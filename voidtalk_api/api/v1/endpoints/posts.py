from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from voidtalk_api.api.deps import get_current_user
from voidtalk_api.core.database import get_db
from voidtalk_api.core.exceptions import PermissionDenied, ResourceNotFound
from voidtalk_api.models.user import User
from voidtalk_api.schemas.post import PostCreate, PostRead
from voidtalk_api.services.posts import PostService


router = APIRouter(prefix="/posts", tags=["posts"])


@router.post("", response_model=PostRead, status_code=status.HTTP_201_CREATED)
def create_post(
    post_data: PostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return PostService(db).create_post(post_data, current_user)


@router.get("/user/{user_id}", response_model=list[PostRead])
def list_posts_by_user(user_id: int, db: Session = Depends(get_db)):
    try:
        return PostService(db).list_posts_by_user(user_id)
    except ResourceNotFound as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        PostService(db).delete_post(post_id, current_user)
    except ResourceNotFound as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except PermissionDenied as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc
