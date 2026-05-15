from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from voidtalk_api.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(24), unique=True, nullable=False)

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    
    # Null in password_hash shoul be treated as compromised. Read docs/auth/PasswordHash_NullValue.md
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    optional_info: Mapped["UserOptionalInfo | None"] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )

    sessions: Mapped[list["UserSession"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )

    posts: Mapped[list["Post"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )


class UserOptionalInfo(Base):
    __tablename__ = "user_optional_info"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    account_description: Mapped[str | None] = mapped_column(Text, nullable=True)

    first_icon_color: Mapped[str] = mapped_column(
        String(7),
        nullable=False,
        server_default="#000000",
    )
    second_icon_color: Mapped[str] = mapped_column(
        String(7),
        nullable=False,
        server_default="#000000",
    )
    icon_id: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default="1",
    )

    user: Mapped[User] = relationship(back_populates="optional_info")


class UserSession(Base):
    __tablename__ = "user_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    session_token: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    user: Mapped[User] = relationship(back_populates="sessions")
