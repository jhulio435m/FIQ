"""Resource routes, ordered so static paths precede the resource-id route."""
from fastapi import APIRouter
from app.api.resources import catalog_router, uploads_router, moderation_router, community_router, access_router

router = APIRouter(redirect_slashes=False)
router.include_router(catalog_router.router, prefix="/resources")
router.include_router(uploads_router.router, prefix="/resources")
router.include_router(moderation_router.router, prefix="/resources")
router.include_router(community_router.router, prefix="/resources")
router.include_router(access_router.router, prefix="/resources")
