from fastapi import APIRouter

from .calibration_targets import router as _calib_router
from .corners import router as _corners_router
from .ringgrid import router as _ringgrid_router

router = APIRouter(tags=["Computer Vision"])
router.include_router(_corners_router)
router.include_router(_calib_router)
router.include_router(_ringgrid_router)
