from sqlalchemy.orm import Session

from voidtalk_api.core.exceptions import PermissionDenied, ResourceNotFound
from voidtalk_api.models.post import Post
from voidtalk_api.models.user import User
from voidtalk_api.repositories.posts import PostRepository
from voidtalk_api.repositories.users import UserRepository
from voidtalk_api.schemas.post import PostCreate


class PostService:
    def __init__(self, db: Session):
        self.posts = PostRepository(db)
        self.users = UserRepository(db)

    def create_post(self, post_data: PostCreate, current_user: User) -> Post:
        return self.posts.create(
            user_id=current_user.id,
            post_body=post_data.post_body,
        )

    def list_posts_by_user(self, user_id: int) -> list[Post]:
        user = self.users.get_by_id(user_id)
        if user is None:
            raise ResourceNotFound("User not found.")

        return self.posts.list_by_user_id(user_id)

    def delete_post(self, post_id: int, current_user: User) -> None:
        post = self.posts.get_by_id(post_id)
        if post is None:
            raise ResourceNotFound("Post not found.")

        if post.user_id != current_user.id:
            raise PermissionDenied("Only the post author can delete this post.")

        self.posts.delete(post)
