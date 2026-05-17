from fastapi import APIRouter

from voidtalk_api.api.v1.endpoints import posts, users

router = APIRouter()
router.include_router(posts.router)
router.include_router(users.router)
