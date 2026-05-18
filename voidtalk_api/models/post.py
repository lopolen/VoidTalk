from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from voidtalk_api.core.database import Base
from voidtalk_api.models.user import User


class Hashtag(Base):
    __tablename__ = "hashtags"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
        index=True,
    )

    post_links: Mapped[list["PostHashtag"]] = relationship(
        back_populates="hashtag",
        cascade="all, delete-orphan",
    )


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    post_body: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user: Mapped[User] = relationship(back_populates="posts")
    likes: Mapped[list["PostUserLike"]] = relationship(
        back_populates="post",
        cascade="all, delete-orphan",
    )
    hashtag_links: Mapped[list["PostHashtag"]] = relationship(
        back_populates="post",
        cascade="all, delete-orphan",
    )


class PostHashtag(Base):
    __tablename__ = "posts_hashtags"

    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id"), primary_key=True)
    hashtag_id: Mapped[int] = mapped_column(
        ForeignKey("hashtags.id"),
        primary_key=True,
    )

    post: Mapped[Post] = relationship(back_populates="hashtag_links")
    hashtag: Mapped[Hashtag] = relationship(back_populates="post_links")


class PostUserLike(Base):
    __tablename__ = "posts_users_likes"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id"), primary_key=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user: Mapped[User] = relationship(back_populates="post_likes")
    post: Mapped[Post] = relationship(back_populates="likes")
