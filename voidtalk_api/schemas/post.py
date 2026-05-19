from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from voidtalk_api.schemas.user import UserPublicProfileRead


class PostCreate(BaseModel):
    post_body: str = Field(min_length=3, max_length=1000)

    @field_validator("post_body")
    @classmethod
    def strip_post_body(cls, post_body: str) -> str:
        post_body = post_body.strip()
        if not post_body:
            raise ValueError("Post body is required.")
        if len(post_body) < 3:
            raise ValueError("Post body must be at least 3 characters long.")
        if len(post_body) > 1000:
            raise ValueError("Post body must be at most 1000 characters long.")
        return post_body


class PostRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    post_body: str
    created_at: datetime


class PostLikeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    post_id: int
    created_at: datetime


class PostLikeCountRead(BaseModel):
    post_id: int
    likes_count: int


class RecommendedPostRead(PostRead):
    likes_count: int
    hashtags: list[str]
    recommendation_score: float
    author: UserPublicProfileRead


class FeedPostRead(PostRead):
    likes_count: int
    hashtags: list[str]
    liked_by_current_user: bool
    author: UserPublicProfileRead
