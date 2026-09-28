import base64
import cv2
import numpy as np
from fastapi import HTTPException, status
from backend.app.core.config import settings

def load_image_from_bytes_or_base64(raw_input: bytes | str) -> np.ndarray:
    """
    Decodes an image from raw bytes, base64 string, or data-URL into a BGR OpenCV NumPy array.
    """
    if isinstance(raw_input, str):
        # Check if it's base64 data URL (e.g. "data:image/jpeg;base64,...")
        if "," in raw_input and "base64" in raw_input:
            raw_input = raw_input.split(",", 1)[1]
        try:
            image_bytes = base64.b64decode(raw_input)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid base64 encoded image string."
            )
    elif isinstance(raw_input, bytes):
        image_bytes = raw_input
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported image payload format."
        )

    if len(image_bytes) > settings.MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image size ({len(image_bytes)} bytes) exceeds the maximum allowed limit of {settings.MAX_IMAGE_SIZE} bytes."
        )

    np_arr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if image is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not decode image. Please provide a valid JPEG, PNG, or WebP photo."
        )

    h, w = image.shape[:2]
    if h < 100 or w < 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image resolution too low ({w}x{h}). Minimum required resolution is 100x100 pixels."
        )

    # Resize if image is excessively large to optimize inference speed
    max_dim = 1280
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        new_w, new_h = int(w * scale), int(h * scale)
        image = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)

    return image
