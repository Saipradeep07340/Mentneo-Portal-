from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date as dt_date

class AttendanceActionPayload(BaseModel):
    image: Optional[str] = Field(None, description="Optional base64 image if performing biometric punch in a single request")
    notes: Optional[str] = Field(None, description="Optional attendance notes")

class BreakStartPayload(BaseModel):
    reason: Optional[str] = Field("Regular Break", description="Break justification/type")

class CorrectionRequestPayload(BaseModel):
    date: dt_date = Field(..., description="Target attendance date YYYY-MM-DD")
    requestedCheckIn: str = Field(..., description="Requested check-in time (e.g., '09:05 AM')")
    requestedCheckOut: str = Field(..., description="Requested check-out time (e.g., '06:15 PM')")
    reason: str = Field(..., min_length=5, description="Justification for regularizing attendance")

class AttendanceBreakItem(BaseModel):
    id: str
    start: str
    end: str
    duration: int

class TodayAttendanceResponse(BaseModel):
    has_attendance: bool
    date: str
    status: str
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    is_on_break: bool
    working_minutes: int
    break_minutes: int
    overtime_minutes: int
    formatted_working_hours: str
    formatted_break_time: str
    breaks: List[AttendanceBreakItem] = []
