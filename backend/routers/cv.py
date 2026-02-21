from fastapi import APIRouter
import uuid

router = APIRouter(tags=["Computer Vision"])

@router.post("/calibrate")
async def calibrate_image():
    """
    Mock endpoint to simulate a camera calibration routine.
    In reality, this would take checkerboard points or multiple images
    and run cv2.calibrateCamera.
    """
    return {
        "status": "success",
        "camera_matrix": [
            [1000.0, 0.0, 320.0],
            [0.0, 1000.0, 240.0],
            [0.0, 0.0, 1.0]
        ],
        "dist_coeffs": [-0.1, 0.01, 0.0, 0.0, 0.0],
        "message": "Dummy calibration parameters returned."
    }

@router.post("/detect-features")
async def detect_features(image_url: str, prompt: str = ""):
    """
    Mock endpoint to simulate feature detection.
    Takes an image URL (e.g. from R2) and an optional prompt.
    Returns random geometrical features.
    """
    return {
        "status": "success",
        "features": [
            {
                "id": str(uuid.uuid4()),
                "type": "bbox",
                "x": 100,
                "y": 100,
                "width": 200,
                "height": 150,
                "rotation": 0,
                "color": "#00ff00"
            },
            {
                "id": str(uuid.uuid4()),
                "type": "point",
                "x": 400,
                "y": 300,
                "color": "#ff0000"
            }
        ]
    }
