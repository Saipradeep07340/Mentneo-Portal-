import json
import uuid
import numpy as np
from fastapi import HTTPException, status
from app.core.database import get_db
from app.core.config import settings
from app.services.recognition_service import face_engine
from app.services.liveness_service import LivenessService
import logging

logger = logging.getLogger("mentneo.face_service")

class FaceService:
    @staticmethod
    def register_face(employee_id: str, image: np.ndarray, client_ip: str = None, user_agent: str = None):
        """
        Registers employee biometric face template:
        1. Checks liveness / quality.
        2. Detects face (strictly 1 face required).
        3. Extracts 128-d ArcFace/SFace feature embedding.
        4. Persists protected template in database.
        5. Records audit trail.
        """
        # 1. Detect faces
        faces = face_engine.detect_faces(image)
        if faces is None or len(faces) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No face detected in the camera frame. Please face the camera directly in good lighting."
            )
        if len(faces) > 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Multiple faces detected ({len(faces)}). Exactly one face must be present during registration."
            )

        best_face = faces[0]
        fx, fy, fw, fh = int(best_face[0]), int(best_face[1]), int(best_face[2]), int(best_face[3])

        # 2. Evaluate liveness and quality
        liveness = LivenessService.evaluate(image, (fx, fy, fw, fh))
        if not liveness.is_live:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Face quality check failed: {liveness.reason}"
            )

        # 3. Extract 128-d embedding
        embedding = face_engine.extract_embedding(image, best_face)
        embedding_list = embedding.tolist()
        template_json = json.dumps(embedding_list)

        # 4. Save to database
        enrollment_id = f"face_{uuid.uuid4().hex[:12]}"
        with get_db() as cur:
            cur.execute("""
                INSERT INTO face_enrollments (id, employee_id, template_data, model_version, quality_score, status, updated_at)
                VALUES (%s, %s, %s, %s, %s, 'ACTIVE', NOW())
                ON CONFLICT (employee_id) DO UPDATE SET
                    template_data = EXCLUDED.template_data,
                    model_version = EXCLUDED.model_version,
                    quality_score = EXCLUDED.quality_score,
                    status = 'ACTIVE',
                    sample_count = face_enrollments.sample_count + 1,
                    updated_at = NOW()
                RETURNING id, sample_count;
            """, (enrollment_id, employee_id, template_json, settings.FACE_MODEL_NAME, liveness.score))
            res = cur.fetchone()

            # Record audit log
            cur.execute("""
                INSERT INTO audit_logs (id, employee_id, action, entity_type, entity_id, details, ip_address, user_agent)
                VALUES (%s, %s, 'FACE_REGISTRATION', 'BIOMETRIC', %s, %s, %s, %s)
            """, (
                f"aud_{uuid.uuid4().hex[:12]}",
                employee_id,
                res["id"],
                json.dumps({"model": settings.FACE_MODEL_NAME, "quality_score": liveness.score}),
                client_ip,
                user_agent
            ))

        return {
            "success": True,
            "message": "Face registered successfully with ArcFace biometric template.",
            "quality_score": liveness.score,
            "sample_count": res["sample_count"],
            "model_version": settings.FACE_MODEL_NAME
        }

    @staticmethod
    def verify_face(employee_id: str, image: np.ndarray, action: str = "VERIFY", client_ip: str = None, user_agent: str = None):
        """
        Verifies employee face against enrolled biometric template:
        1. Retrieves enrolled template from database.
        2. Detects single face in live capture.
        3. Extracts live 128-d embedding.
        4. Calculates cosine similarity and Euclidean distance.
        5. Logs verification attempt and audit event.
        """
        # 1. Fetch registered template
        with get_db() as cur:
            cur.execute("""
                SELECT id, template_data, model_version, status
                FROM face_enrollments
                WHERE employee_id = %s AND status = 'ACTIVE'
            """, (employee_id,))
            enrollment = cur.fetchone()

        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No registered face biometric template found for this employee. Please complete face registration first."
            )

        try:
            stored_vector = np.array(json.loads(enrollment["template_data"]), dtype=np.float32)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Corrupted biometric template data in database."
            )

        # 2. Detect face in live image
        faces = face_engine.detect_faces(image)
        if faces is None or len(faces) == 0:
            FaceService._log_verification(employee_id, action, False, 0.0, 1.0, 0.0, client_ip, user_agent, "No face detected in live feed.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No face detected. Please position your face inside the camera guide."
            )

        if len(faces) > 1:
            FaceService._log_verification(employee_id, action, False, 0.0, 1.0, 0.0, client_ip, user_agent, "Multiple faces detected.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Multiple faces detected ({len(faces)}). Please ensure only one person is visible to verify identity."
            )

        best_face = faces[0]
        fx, fy, fw, fh = int(best_face[0]), int(best_face[1]), int(best_face[2]), int(best_face[3])

        # 3. Liveness / quality check
        liveness = LivenessService.evaluate(image, (fx, fy, fw, fh))
        if not liveness.is_live:
            FaceService._log_verification(employee_id, action, False, 0.0, 1.0, liveness.score, client_ip, user_agent, liveness.reason)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Verification rejected: {liveness.reason}"
            )

        # 4. Extract live embedding
        live_embedding = face_engine.extract_embedding(image, best_face)

        # 5. Compare with stored template
        is_match, confidence, distance = face_engine.compare_embeddings(live_embedding, stored_vector)

        # 6. Log attempt in database
        failure_reason = None if is_match else f"Face mismatch: distance {distance:.4f} exceeds threshold {settings.FACE_MATCH_THRESHOLD:.4f}"
        FaceService._log_verification(employee_id, action, is_match, confidence, distance, liveness.score, client_ip, user_agent, failure_reason)

        if not is_match:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Face verification failed: Biometric match confidence is below the required security threshold."
            )

        return {
            "verified": True,
            "employee_id": employee_id,
            "confidence": confidence,
            "distance": distance,
            "message": "Face verified successfully."
        }

    @staticmethod
    def get_face_status(employee_id: str):
        with get_db() as cur:
            cur.execute("""
                SELECT id, model_version, quality_score, sample_count, status, created_at, updated_at
                FROM face_enrollments
                WHERE employee_id = %s
            """, (employee_id,))
            res = cur.fetchone()
            if not res:
                return {
                    "is_registered": False,
                    "status": "NOT_ENROLLED"
                }
            return {
                "is_registered": res["status"] == "ACTIVE",
                "status": res["status"],
                "model_version": res["model_version"],
                "quality_score": res["quality_score"],
                "sample_count": res["sample_count"],
                "registered_at": res["created_at"].isoformat() if res["created_at"] else None,
                "updated_at": res["updated_at"].isoformat() if res["updated_at"] else None
            }

    @staticmethod
    def delete_face_registration(employee_id: str, client_ip: str = None, user_agent: str = None):
        with get_db() as cur:
            cur.execute("DELETE FROM face_enrollments WHERE employee_id = %s RETURNING id;", (employee_id,))
            deleted = cur.fetchone()
            if not deleted:
                raise HTTPException(status_code=404, detail="No face registration found to delete.")

            cur.execute("""
                INSERT INTO audit_logs (id, employee_id, action, entity_type, entity_id, details, ip_address, user_agent)
                VALUES (%s, %s, 'FACE_REGISTRATION_DELETED', 'BIOMETRIC', %s, %s, %s, %s)
            """, (
                f"aud_{uuid.uuid4().hex[:12]}",
                employee_id,
                deleted["id"],
                json.dumps({"reason": "Employee or admin requested biometric deletion"}),
                client_ip,
                user_agent
            ))
        return {"success": True, "message": "Biometric face registration removed successfully."}

    @staticmethod
    def _log_verification(employee_id: str, action: str, verified: bool, confidence: float, distance: float, liveness: float, ip: str, ua: str, reason: str = None):
        try:
            with get_db() as cur:
                cur.execute("""
                    INSERT INTO face_verification_logs (
                        id, employee_id, action, verified, confidence_score, distance, liveness_score, ip_address, device_info, failure_reason
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    f"fvl_{uuid.uuid4().hex[:12]}",
                    employee_id,
                    action,
                    verified,
                    confidence,
                    distance,
                    liveness,
                    ip,
                    ua,
                    reason
                ))
                # Also log security audit
                audit_action = "FACE_VERIFICATION" if verified else "FACE_VERIFICATION_FAILED"
                cur.execute("""
                    INSERT INTO audit_logs (id, employee_id, action, entity_type, details, ip_address, user_agent)
                    VALUES (%s, %s, %s, 'BIOMETRIC', %s, %s, %s)
                """, (
                    f"aud_{uuid.uuid4().hex[:12]}",
                    employee_id,
                    audit_action,
                    json.dumps({"action": action, "verified": verified, "confidence": confidence, "reason": reason}),
                    ip,
                    ua
                ))
        except Exception as e:
            logger.error(f"Failed to log face verification: {e}")
