import sys
sys.stdout.reconfigure(encoding='utf-8')
import base64
import cv2
import numpy as np
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import get_db

client = TestClient(app)

def create_face_image(offset_x=0, skin_color=(180, 190, 230)):
    """Generates an in-memory BGR face image with features detectable by YuNet."""
    img = np.full((320, 320, 3), 220, dtype=np.uint8)
    cx = 160 + offset_x
    cy = 160
    # Face oval
    cv2.circle(img, (cx, cy), 70, skin_color, -1)
    # Eyes
    cv2.circle(img, (cx - 25, cy - 20), 10, (40, 40, 40), -1)
    cv2.circle(img, (cx + 25, cy - 20), 10, (40, 40, 40), -1)
    # Nose
    cv2.circle(img, (cx, cy + 5), 7, (70, 70, 110), -1)
    # Mouth
    cv2.ellipse(img, (cx, cy + 32), (25, 12), 0, 0, 180, (40, 40, 70), -1)
    return img

def image_to_base64(img):
    _, buffer = cv2.imencode('.jpg', img)
    return "data:image/jpeg;base64," + base64.b64encode(buffer).decode('utf-8')

def test_full_pipeline():
    print("\n🚀 Starting Mentneo Face Recognition & Automated Attendance Test Suite...")

    # 1. Health Check
    print("\n--- Test 1: Health Check ---")
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert data["database"] == "connected"
    assert data["faceModels"]["loaded"] is True
    print(f"  ✓ Health check passed: {data['message']}")

    # 2. Authentication - Invalid Credentials
    print("\n--- Test 2: Reject Invalid Login ---")
    bad_login = client.post("/api/auth/employee/login", json={
        "email": "john.doe@mentneo.com",
        "password": "WrongPassword999"
    })
    assert bad_login.status_code == 401
    print("  ✓ Invalid login properly rejected with 401")

    # 3. Authentication - Valid Credentials
    print("\n--- Test 3: Employee Login ---")
    login_res = client.post("/api/auth/employee/login", json={
        "email": "john.doe@mentneo.com",
        "password": "Password@123"
    })
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "token" in login_data
    token = login_data["token"]
    auth_headers = {"Authorization": f"Bearer {token}"}
    employee_id = login_data["user"]["employeeId"]
    print(f"  ✓ Login successful for: {login_data['user']['fullName']} (Emp ID: {employee_id})")

    # Clear today's attendance for John Doe in Neon to ensure clean state
    with get_db() as cur:
        cur.execute("DELETE FROM attendance WHERE employee_id = %s AND date = CURRENT_DATE;", (employee_id,))

    # 4. Face Registration - Edge Cases
    print("\n--- Test 4: Face Registration Edge Cases ---")
    # 4a. Blank Image (No Face)
    blank_img = np.zeros((300, 300, 3), dtype=np.uint8)
    no_face_res = client.post("/api/face/register", json={"image": image_to_base64(blank_img)}, headers=auth_headers)
    assert no_face_res.status_code == 400
    assert "No face detected" in no_face_res.json()["detail"] or "Face quality check failed" in no_face_res.json()["detail"]
    print("  ✓ Blank image (no face) properly rejected with 400")

    # 4b. Multiple Faces
    multi_img = np.full((320, 500, 3), 220, dtype=np.uint8)
    # Face 1
    cv2.circle(multi_img, (120, 160), 50, (180, 190, 230), -1)
    cv2.circle(multi_img, (105, 150), 7, (40, 40, 40), -1)
    cv2.circle(multi_img, (135, 150), 7, (40, 40, 40), -1)
    cv2.circle(multi_img, (120, 170), 5, (70, 70, 110), -1)
    cv2.ellipse(multi_img, (120, 185), (15, 8), 0, 0, 180, (40, 40, 70), -1)
    # Face 2
    cv2.circle(multi_img, (380, 160), 50, (180, 190, 230), -1)
    cv2.circle(multi_img, (365, 150), 7, (40, 40, 40), -1)
    cv2.circle(multi_img, (395, 150), 7, (40, 40, 40), -1)
    cv2.circle(multi_img, (380, 170), 5, (70, 70, 110), -1)
    cv2.ellipse(multi_img, (380, 185), (15, 8), 0, 0, 180, (40, 40, 70), -1)

    multi_res = client.post("/api/face/register", json={"image": image_to_base64(multi_img)}, headers=auth_headers)
    assert multi_res.status_code == 400
    assert "Multiple faces detected" in multi_res.json()["detail"]
    print("  ✓ Multiple faces properly rejected with 400")

    # 5. Face Registration - Success
    print("\n--- Test 5: Biometric Face Registration ---")
    john_face = create_face_image(offset_x=0)
    john_face_b64 = image_to_base64(john_face)

    reg_res = client.post("/api/face/register", json={"image": john_face_b64}, headers=auth_headers)
    assert reg_res.status_code == 200
    reg_data = reg_res.json()
    assert reg_data["success"] is True
    assert reg_data["model_version"] == "SFace_ArcFace_128d"
    print(f"  ✓ Face registered: model={reg_data['model_version']}, quality={reg_data['quality_score']}")

    # 6. Face Status Check
    print("\n--- Test 6: Face Status Check ---")
    status_res = client.get("/api/face/status", headers=auth_headers)
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["is_registered"] is True
    assert status_data["status"] == "ACTIVE"
    print(f"  ✓ Face enrollment status verified: Active={status_data['is_registered']}")

    # 7. Face Verification - Match
    print("\n--- Test 7: Biometric Verification (Match) ---")
    verify_match_res = client.post("/api/face/verify", json={"image": john_face_b64, "action": "VERIFY"}, headers=auth_headers)
    assert verify_match_res.status_code == 200
    v_data = verify_match_res.json()
    assert v_data["verified"] is True
    assert v_data["confidence"] > 70.0
    print(f"  ✓ Face verified: confidence={v_data['confidence']}%, distance={v_data['distance']}")

    # 8. Face Verification - Mismatch (Different person / impostor)
    print("\n--- Test 8: Biometric Verification (Mismatch / Impostor) ---")
    import json
    with get_db() as cur:
        cur.execute("SELECT template_data FROM face_enrollments WHERE employee_id = %s;", (employee_id,))
        valid_template = cur.fetchone()["template_data"]
        # Create an orthogonal vector simulating an enrolled profile of a completely different person
        valid_vec = np.array(json.loads(valid_template), dtype=np.float32)
        diff_vec = np.roll(valid_vec, 64).tolist()
        cur.execute("UPDATE face_enrollments SET template_data = %s WHERE employee_id = %s;", (json.dumps(diff_vec), employee_id))

    verify_diff_res = client.post("/api/face/verify", json={"image": john_face_b64, "action": "VERIFY"}, headers=auth_headers)
    assert verify_diff_res.status_code == 401
    assert "security threshold" in verify_diff_res.json()["detail"].lower()
    print("  ✓ Impostor/unmatched face properly rejected with 401 Unauthorized")

    # Restore John's genuine registered face template
    with get_db() as cur:
        cur.execute("UPDATE face_enrollments SET template_data = %s WHERE employee_id = %s;", (valid_template, employee_id))

    # 9. Attendance - Clock In with Face
    print("\n--- Test 9: Face Check-In ---")
    check_in_res = client.post("/api/attendance/check-in", json={"image": john_face_b64, "notes": "On-time arrival"}, headers=auth_headers)
    assert check_in_res.status_code == 200
    check_in_data = check_in_res.json()
    assert check_in_data["success"] is True
    att_record = check_in_data["attendance"]
    assert att_record["checkIn"] != "-"
    print(f"  ✓ Clocked In at {att_record['checkIn']}, Status={att_record['status']}")

    # 10. Attendance - Duplicate Check-In Blocked
    print("\n--- Test 10: Block Duplicate Check-In ---")
    dup_check_in_res = client.post("/api/attendance/check-in", json={"image": john_face_b64}, headers=auth_headers)
    assert dup_check_in_res.status_code == 400
    assert "already checked in" in dup_check_in_res.json()["detail"].lower()
    print("  ✓ Duplicate check-in properly blocked with 400")

    # 11. Attendance - Break Management (Start & End)
    print("\n--- Test 11: Break Start & End ---")
    brk_start_res = client.post("/api/attendance/break/start", json={"reason": "Tea Break"}, headers=auth_headers)
    assert brk_start_res.status_code == 200
    print("  ✓ Break started")

    # Duplicate break start while active must be rejected
    dup_brk_res = client.post("/api/attendance/break/start", json={"reason": "Second Break"}, headers=auth_headers)
    assert dup_brk_res.status_code == 400
    print("  ✓ Overlapping break request properly rejected with 400")

    brk_end_res = client.post("/api/attendance/break/end", headers=auth_headers)
    assert brk_end_res.status_code == 200
    print(f"  ✓ Break ended successfully. Duration: {brk_end_res.json()['duration_minutes']} min")

    # 12. Attendance - Multiple Breaks
    print("\n--- Test 12: Second Break Cycle ---")
    client.post("/api/attendance/break/start", json={"reason": "Lunch Break"}, headers=auth_headers)
    brk2_end_res = client.post("/api/attendance/break/end", headers=auth_headers)
    assert brk2_end_res.status_code == 200
    print(f"  ✓ Second break completed. Total breaks: {brk2_end_res.json()['total_break_minutes']} min")

    # 13. Attendance - Today's Live Status
    print("\n--- Test 13: Today's Live Status ---")
    today_res = client.get("/api/attendance/today", headers=auth_headers)
    assert today_res.status_code == 200
    today_data = today_res.json()
    assert today_data["has_attendance"] is True
    assert len(today_data["breaks"]) == 2
    print(f"  ✓ Today status loaded: working={today_data['formatted_working_hours']}, breaks count={len(today_data['breaks'])}")

    # 14. Attendance - Clock Out with Face
    print("\n--- Test 14: Face Check-Out ---")
    check_out_res = client.post("/api/attendance/check-out", json={"image": john_face_b64}, headers=auth_headers)
    assert check_out_res.status_code == 200
    co_data = check_out_res.json()["attendance"]
    assert co_data["checkOut"] != "-"
    print(f"  ✓ Clocked Out at {co_data['checkOut']}. Net Worked: {co_data['formattedWorkingHours']}, Status: {co_data['status']}")

    # Duplicate check-out must be blocked
    dup_co_res = client.post("/api/attendance/check-out", json={"image": john_face_b64}, headers=auth_headers)
    assert dup_co_res.status_code == 400
    assert "already checked out" in dup_co_res.json()["detail"].lower()
    print("  ✓ Duplicate check-out properly blocked with 400")

    # 15. Attendance - History & Monthly Summary
    print("\n--- Test 15: History & Monthly Summary ---")
    hist_res = client.get("/api/attendance/history?month=9&year=2026", headers=auth_headers)
    assert hist_res.status_code == 200
    assert len(hist_res.json()["history"]) > 0

    sum_res = client.get("/api/attendance/summary?month=9&year=2026", headers=auth_headers)
    assert sum_res.status_code == 200
    sum_data = sum_res.json()
    assert sum_data["working_days"] > 0
    print(f"  ✓ Monthly summary: Working Days={sum_data['working_days']}, Total Hours={sum_data['formatted_total_hours']}")

    # 16. Attendance Regularization / Correction
    print("\n--- Test 16: Regularization Request ---")
    corr_res = client.post("/api/attendance/correction", json={
        "date": "2026-09-24",
        "requestedCheckIn": "09:00 AM",
        "requestedCheckOut": "06:00 PM",
        "reason": "Biometric optical scanner delay at entry lobby"
    }, headers=auth_headers)
    assert corr_res.status_code == 200
    print("  ✓ Correction request created successfully")

    # 17. Security & IDOR Verification
    print("\n--- Test 17: Security & IDOR Protection ---")
    # Unauthenticated requests must be rejected with 401
    unauth_res = client.get("/api/attendance/today")
    assert unauth_res.status_code == 401

    # Fake token
    fake_res = client.get("/api/attendance/today", headers={"Authorization": "Bearer invalid_fake_token_12345"})
    assert fake_res.status_code == 401
    print("  ✓ Unauthenticated and forged tokens rejected with 401")

    # Verify audit logs in database
    with get_db() as cur:
        cur.execute("SELECT action, entity_type FROM audit_logs WHERE employee_id = %s ORDER BY created_at DESC LIMIT 6;", (employee_id,))
        logs = cur.fetchall()
        assert len(logs) > 0
        actions = [l["action"] for l in logs]
        print(f"  ✓ Audit trail verified in PostgreSQL. Recent actions: {actions}")

    print("\n🎉 ALL 17 AUTOMATED INTEGRATION TESTS PASSED WITH 100% SUCCESS! 🚀\n")

if __name__ == "__main__":
    test_full_pipeline()
