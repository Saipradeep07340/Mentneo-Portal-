import uuid
import json
from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, Depends, HTTPException, Request, status
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, get_current_employee, get_current_user

router = APIRouter(prefix="/auth/employee", tags=["Authentication"])

class EmployeeLoginRequest(BaseModel):
    email: EmailStr
    password: str

@router.post("/login")
async def employee_login(payload: EmployeeLoginRequest, request: Request):
    clean_email = payload.email.strip().lower()

    with get_db() as cur:
        cur.execute("""
            SELECT u.id, u.email, u.password_hash, u.full_name, u.role, u.status,
                   e.id as employee_id, e.employee_code, e.first_name, e.last_name,
                   e.designation, e.department_id, e.avatar_url
            FROM users u
            JOIN employees e ON u.id = e.user_id
            WHERE LOWER(u.email) = %s AND u.status = 'ACTIVE'
        """, (clean_email,))
        user = cur.fetchone()

        if not user or not verify_password(payload.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid corporate email or password. Please verify your credentials."
            )

        token = create_access_token(data={"sub": user["id"], "role": user["role"]})
        session_id = f"sess_{uuid.uuid4().hex[:12]}"
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")

        cur.execute("""
            INSERT INTO user_sessions (id, user_id, token, ip_address, user_agent, last_active_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
        """, (session_id, user["id"], token, client_ip, user_agent))

        cur.execute("""
            INSERT INTO audit_logs (id, employee_id, action, entity_type, entity_id, details, ip_address, user_agent)
            VALUES (%s, %s, 'LOGIN', 'AUTH', %s, %s, %s, %s)
        """, (
            f"aud_{uuid.uuid4().hex[:12]}",
            user["employee_id"],
            session_id,
            json.dumps({"email": clean_email}),
            client_ip,
            user_agent
        ))

    return {
        "success": True,
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "fullName": f"{user['first_name']} {user['last_name']}",
            "employeeId": user["employee_id"],
            "employeeCode": user["employee_code"],
            "designation": user["designation"],
            "avatarUrl": user["avatar_url"]
        }
    }

@router.post("/logout")
async def employee_logout(request: Request, current_user: dict = Depends(get_current_user)):
    token = current_user.get("token")
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")

    if token:
        with get_db() as cur:
            cur.execute("DELETE FROM user_sessions WHERE token = %s;", (token,))
            cur.execute("""
                INSERT INTO audit_logs (id, employee_id, action, entity_type, details, ip_address, user_agent)
                VALUES (%s, %s, 'LOGOUT', 'AUTH', %s, %s, %s)
            """, (
                f"aud_{uuid.uuid4().hex[:12]}",
                current_user["id"],
                json.dumps({"token_revoked": True}),
                client_ip,
                user_agent
            ))

    return {"success": True, "message": "Successfully logged out."}

@router.get("/me")
async def employee_me(current_employee: dict = Depends(get_current_employee)):
    return {
        "user": {
            "id": current_employee["user_id"],
            "email": current_employee["email"],
            "role": current_employee["role"],
            "fullName": current_employee["full_name"],
            "employeeId": current_employee["id"],
            "employeeCode": current_employee["employee_code"],
            "designation": current_employee["designation"],
            "department": current_employee["department_name"],
            "avatarUrl": current_employee.get("avatar_url")
        }
    }
