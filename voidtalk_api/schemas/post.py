from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PostCreate(BaseModel):
    post_body: str = Field(min_length=1)

    @field_validator("post_body")
    @classmethod
    def strip_post_body(cls, post_body: str) -> str:
        post_body = post_body.strip()
        if not post_body:
            raise ValueError("Post body is required.")
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
