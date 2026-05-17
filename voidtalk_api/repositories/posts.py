from sqlalchemy import select
from sqlalchemy.orm import Session

from voidtalk_api.models.post import Post


class PostRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, user_id: int, post_body: str) -> Post:
        post = Post(user_id=user_id, post_body=post_body)

        self.db.add(post)
        self.db.commit()
        self.db.refresh(post)
        return post

    def get_by_id(self, post_id: int) -> Post | None:
        return self.db.get(Post, post_id)

    def list_by_user_id(self, user_id: int) -> list[Post]:
        return list(
            self.db.scalars(
                select(Post)
                .where(Post.user_id == user_id)
                .order_by(Post.created_at.desc(), Post.id.desc())
            )
        )

    def delete(self, post: Post) -> None:
        self.db.delete(post)
        self.db.commit()
