from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from voidtalk_api.core.exceptions import ResourceAlreadyExists
from voidtalk_api.models.post import PostUserLike


class PostLikeRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, user_id: int, post_id: int) -> PostUserLike:
        post_like = PostUserLike(user_id=user_id, post_id=post_id)

        self.db.add(post_like)
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise ResourceAlreadyExists("User already liked this post.") from exc

        self.db.refresh(post_like)
        return post_like

    def get(self, user_id: int, post_id: int) -> PostUserLike | None:
        return self.db.get(PostUserLike, (user_id, post_id))

    def delete(self, post_like: PostUserLike) -> None:
        self.db.delete(post_like)
        self.db.commit()

    def count_by_post_id(self, post_id: int) -> int:
        return self.db.scalar(
            select(func.count()).select_from(PostUserLike).where(
                PostUserLike.post_id == post_id
            )
        )
