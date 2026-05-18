from dataclasses import dataclass
from datetime import datetime

from sqlalchemy.orm import Session

from voidtalk_api.core.hashtags import extract_hashtag_names
from voidtalk_api.core.exceptions import PermissionDenied, ResourceNotFound
from voidtalk_api.models.post import Post
from voidtalk_api.models.user import User, UserOptionalInfo
from voidtalk_api.repositories.hashtags import HashtagRepository
from voidtalk_api.repositories.post_likes import PostLikeRepository
from voidtalk_api.repositories.posts import PostRepository
from voidtalk_api.repositories.users import UserRepository
from voidtalk_api.schemas.post import PostCreate


@dataclass(frozen=True)
class PublicUserProfile:
    id: int
    username: str
    created_at: datetime
    optional_info: UserOptionalInfo | None


@dataclass(frozen=True)
class FeedPost:
    id: int
    user_id: int
    post_body: str
    created_at: datetime
    likes_count: int
    hashtags: list[str]
    liked_by_current_user: bool
    author: PublicUserProfile


class PostService:
    def __init__(self, db: Session):
        self.posts = PostRepository(db)
        self.hashtags = HashtagRepository(db)
        self.post_likes = PostLikeRepository(db)
        self.users = UserRepository(db)

    def create_post(self, post_data: PostCreate, current_user: User) -> Post:
        post = self.posts.create(
            user_id=current_user.id,
            post_body=post_data.post_body,
        )
        self.hashtags.attach_to_post(
            post_id=post.id,
            names=extract_hashtag_names(post.post_body),
        )

        return post

    def list_posts_by_user(self, user_id: int) -> list[Post]:
        user = self.users.get_by_id(user_id)
        if user is None:
            raise ResourceNotFound("User not found.")

        return self.posts.list_by_user_id(user_id)

    def list_feed(self, current_user: User, limit: int | None = None) -> list[FeedPost]:
        safe_limit = max(1, min(limit or 30, 100))
        posts = self.posts.list_recent(safe_limit)
        post_ids = [post.id for post in posts]
        likes_by_post_id = self.post_likes.count_by_post_ids(post_ids)
        liked_post_ids = self.post_likes.list_liked_post_ids(
            current_user.id,
            post_ids,
        )
        hashtags_by_post_id = self.hashtags.list_by_post_ids(post_ids)

        return [
            FeedPost(
                id=post.id,
                user_id=post.user_id,
                post_body=post.post_body,
                created_at=post.created_at,
                likes_count=likes_by_post_id.get(post.id, 0),
                hashtags=hashtags_by_post_id.get(post.id, []),
                liked_by_current_user=post.id in liked_post_ids,
                author=PublicUserProfile(
                    id=post.user.id,
                    username=post.user.username,
                    created_at=post.user.created_at,
                    optional_info=post.user.optional_info,
                ),
            )
            for post in posts
        ]

    def delete_post(self, post_id: int, current_user: User) -> None:
        post = self.posts.get_by_id(post_id)
        if post is None:
            raise ResourceNotFound("Post not found.")

        if post.user_id != current_user.id:
            raise PermissionDenied("Only the post author can delete this post.")

        self.posts.delete(post)
