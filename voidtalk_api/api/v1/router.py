from fastapi import APIRouter

from voidtalk_api.api.v1.endpoints import users

router = APIRouter()
router.include_router(users.router)
