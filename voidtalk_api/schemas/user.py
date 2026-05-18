from datetime import datetime

import re

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


HEX_COLOR_PATTERN = re.compile(r"^#[0-9A-Fa-f]{6}$")


class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=20)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def strip_username(cls, username: str) -> str:
        username = username.strip()
        if len(username) < 3:
            raise ValueError("Username must contain at least 3 characters.")
        return username


class UserLogin(BaseModel):
    login: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("login")
    @classmethod
    def strip_login(cls, login: str) -> str:
        login = login.strip()
        if not login:
            raise ValueError("Login is required.")
        return login


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: EmailStr
    created_at: datetime


class UserPublicRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    created_at: datetime


class UserOptionalInfoReplace(BaseModel):
    account_description: str | None = None
    first_icon_color: str = Field(default="#000000")
    second_icon_color: str = Field(default="#000000")
    icon_id: int = Field(default=1, ge=1)

    @field_validator("account_description")
    @classmethod
    def strip_account_description(cls, account_description: str | None) -> str | None:
        if account_description is None:
            return None

        account_description = account_description.strip()
        return account_description or None

    @field_validator("first_icon_color", "second_icon_color")
    @classmethod
    def validate_hex_color(cls, color: str) -> str:
        if not HEX_COLOR_PATTERN.fullmatch(color):
            raise ValueError("Color must be a HEX value like #000000.")
        return color


class UserOptionalInfoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    account_description: str | None
    first_icon_color: str
    second_icon_color: str
    icon_id: int


class UserPublicProfileRead(UserPublicRead):
    optional_info: UserOptionalInfoRead | None = None
