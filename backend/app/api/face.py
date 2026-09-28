from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form, status
from typing import Optional
from backend.app.core.security import get_current_employee
from backend.app.schemas.face import FaceBase64Payload, FaceVerificationResponse, FaceRegistrationResponse, FaceStatusResponse
from backend.app.services.face_service import FaceService
from backend.app.utils.image_processing import load_image_from_bytes_or_base64

router = APIRouter(prefix="/face", tags=["Face Recognition"])

@router.post("/register", response_model=FaceRegistrationResponse)
async def register_face(
    request: Request,
    image_file: Optional[UploadFile] = File(None),
    payload: Optional[FaceBase64Payload] = None,
    current_employee: dict = Depends(get_current_employee)
):
    """
    Registers the authenticated employee's biometric facial template.
    Accepts either multipart file upload or JSON with base64 encoded image.
    """
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    if image_file:
        content = await image_file.read()
        image = load_image_from_bytes_or_base64(content)
    elif payload and payload.image:
        image = load_image_from_bytes_or_base64(payload.image)
    else:
        # Check if json body was posted directly
        try:
            body = await request.json()
            if "image" in body:
                image = load_image_from_bytes_or_base64(body["image"])
            elif "templateData" in body and isinstance(body["templateData"], list):
                # Fallback if frontend sends pre-extracted vector (for backwards compatibility)
                import json, uuid
                from backend.app.core.database import get_db
                from backend.app.core.config import settings
                with get_db() as cur:
                    cur.execute("""
                        INSERT INTO face_enrollments (id, employee_id, template_data, model_version, quality_score, status, updated_at)
                        VALUES (%s, %s, %s, %s, %s, 'ACTIVE', NOW())
                        ON CONFLICT (employee_id) DO UPDATE SET
                            template_data = EXCLUDED.template_data,
                            quality_score = EXCLUDED.quality_score,
                            updated_at = NOW()
                        RETURNING id, sample_count;
                    """, (f"face_{uuid.uuid4().hex[:12]}", current_employee["id"], json.dumps(body["templateData"]), settings.FACE_MODEL_NAME, float(body.get("qualityScore", 0.95))))
                    res = cur.fetchone()
                return FaceRegistrationResponse(
                    success=True,
                    message="Face vector registered successfully.",
                    quality_score=float(body.get("qualityScore", 0.95)),
                    sample_count=res["sample_count"],
                    model_version=settings.FACE_MODEL_NAME
                )
            else:
                raise ValueError()
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No image provided. Please supply an image file or base64 photo."
            )

    result = FaceService.register_face(current_employee["id"], image, client_ip, user_agent)
    return FaceRegistrationResponse(**result)

@router.post("/verify", response_model=FaceVerificationResponse)
async def verify_face(
    request: Request,
    image_file: Optional[UploadFile] = File(None),
    payload: Optional[FaceBase64Payload] = None,
    action: Optional[str] = Form("VERIFY"),
    current_employee: dict = Depends(get_current_employee)
):
    """
    Verifies live camera capture against the authenticated employee's registered biometric template.
    Does not allow verifying another employee's face (strict IDOR protection).
    """
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    target_action = action
    if image_file:
        content = await image_file.read()
        image = load_image_from_bytes_or_base64(content)
    elif payload and payload.image:
        image = load_image_from_bytes_or_base64(payload.image)
        if payload.action:
            target_action = payload.action
    else:
        try:
            body = await request.json()
            if "image" in body:
                image = load_image_from_bytes_or_base64(body["image"])
                target_action = body.get("action", "VERIFY")
            elif "templateData" in body and isinstance(body["templateData"], list):
                # Backwards-compatible vector comparison
                import numpy as np, json
                from backend.app.core.database import get_db
                from backend.app.services.recognition_service import face_engine
                from backend.app.core.config import settings
                with get_db() as cur:
                    cur.execute("SELECT template_data FROM face_enrollments WHERE employee_id = %s AND status = 'ACTIVE'", (current_employee["id"],))
                    row = cur.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="No registered biometric template found.")
                stored = np.array(json.loads(row["template_data"]), dtype=np.float32)
                live = np.array(body["templateData"], dtype=np.float32)
                # Euclidean distance match
                dist = float(np.linalg.norm(stored - live))
                is_match = dist <= 0.60
                confidence = max(0.0, min(100.0, (1.0 - dist) * 100.0))
                if not is_match:
                    raise HTTPException(status_code=401, detail="Face mismatch. Security threshold not met.")
                return FaceVerificationResponse(
                    verified=True,
                    employee_id=current_employee["id"],
                    confidence=round(confidence, 2),
                    distance=round(dist, 4),
                    message="Face verified successfully."
                )
            else:
                raise ValueError()
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No image provided for face verification."
            )

    result = FaceService.verify_face(current_employee["id"], image, target_action, client_ip, user_agent)
    return FaceVerificationResponse(**result)

@router.get("/status", response_model=FaceStatusResponse)
async def face_status(current_employee: dict = Depends(get_current_employee)):
    """
    Returns whether the authenticated employee has an active biometric face enrollment.
    """
    result = FaceService.get_face_status(current_employee["id"])
    return FaceStatusResponse(**result)

@router.delete("/registration")
async def delete_face_registration(request: Request, current_employee: dict = Depends(get_current_employee)):
    """
    Revokes the employee's stored face template.
    """
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    result = FaceService.delete_face_registration(current_employee["id"], client_ip, user_agent)
    return result
