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
