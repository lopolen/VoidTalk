from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


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
