from sqlalchemy.orm import Session

from voidtalk_api.core.exceptions import ResourceAlreadyExists, ResourceNotFound
from voidtalk_api.models.post import PostUserLike
from voidtalk_api.models.user import User
from voidtalk_api.repositories.post_likes import PostLikeRepository
from voidtalk_api.repositories.posts import PostRepository


class PostLikeService:
    def __init__(self, db: Session):
        self.post_likes = PostLikeRepository(db)
        self.posts = PostRepository(db)

    def create_like(self, post_id: int, current_user: User) -> PostUserLike:
        post = self.posts.get_by_id(post_id)
        if post is None:
            raise ResourceNotFound("Post not found.")

        try:
            return self.post_likes.create(
                user_id=current_user.id,
                post_id=post_id,
            )
        except ResourceAlreadyExists as exc:
            raise ResourceAlreadyExists("User already liked this post.") from exc

    def delete_like(self, post_id: int, current_user: User) -> None:
        post = self.posts.get_by_id(post_id)
        if post is None:
            raise ResourceNotFound("Post not found.")

        post_like = self.post_likes.get(
            user_id=current_user.id,
            post_id=post_id,
        )
        if post_like is None:
            raise ResourceNotFound("Like not found.")

        self.post_likes.delete(post_like)

    def count_likes(self, post_id: int) -> int:
        post = self.posts.get_by_id(post_id)
        if post is None:
            raise ResourceNotFound("Post not found.")

        return self.post_likes.count_by_post_id(post_id)
