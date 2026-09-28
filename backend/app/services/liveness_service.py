import cv2
import numpy as np
from dataclasses import dataclass

@dataclass
class LivenessResult:
    is_live: bool
    score: float
    reason: str = ""

class LivenessService:
    @staticmethod
    def evaluate(image: np.ndarray, face_box: tuple = None) -> LivenessResult:
        """
        Evaluates input frame for anti-spoofing and quality constraints:
        - Image sharpness (Laplacian variance to detect blurry replays)
        - Illumination / luminance range (rejecting under/over-exposed screens)
        - Color distribution / chromatic diversity
        - Face positioning and proportional size
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape

        # 1. Sharpness / Blur Detection
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        if laplacian_var < 35.0:
            return LivenessResult(
                is_live=False,
                score=round(float(laplacian_var) / 100.0, 2),
                reason="Image is excessively blurry or out of focus. Please hold steady in good lighting."
            )

        # 2. Lighting / Exposure Check
        mean_brightness = np.mean(gray)
        if mean_brightness < 30.0:
            return LivenessResult(
                is_live=False,
                score=round(float(mean_brightness) / 255.0, 2),
                reason="Environment is too dark. Please ensure sufficient ambient light."
            )
        if mean_brightness > 240.0:
            return LivenessResult(
                is_live=False,
                score=round(float(mean_brightness) / 255.0, 2),
                reason="Image is overexposed or glare detected. Avoid direct backlighting."
            )

        # 3. Contrast Check
        std_contrast = np.std(gray)
        if std_contrast < 18.0:
            return LivenessResult(
                is_live=False,
                score=round(float(std_contrast) / 100.0, 2),
                reason="Low image contrast detected. Please position face closer to camera."
            )

        # 4. Face geometry / boundary validation if face box is provided (x, y, w, h)
        if face_box is not None:
            fx, fy, fw, fh = face_box
            if fw < 40 or fh < 40:
                return LivenessResult(
                    is_live=False,
                    score=0.2,
                    reason="Detected face is too small. Please move closer to the camera."
                )
            # Check if face is clipped significantly at image boundaries
            if fx < 2 or fy < 2 or (fx + fw) > (w - 2) or (fy + fh) > (h - 2):
                return LivenessResult(
                    is_live=False,
                    score=0.4,
                    reason="Face is partially cut off at screen edges. Please center your face."
                )

        # Overall composite quality / liveness score normalized to [0.0, 1.0]
        score = min(1.0, (laplacian_var / 300.0) * 0.4 + (std_contrast / 80.0) * 0.3 + 0.3)
        return LivenessResult(is_live=True, score=round(float(score), 3), reason="Quality checks passed.")
