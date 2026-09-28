from pydantic import BaseModel, Field
from typing import Optional

class FaceBase64Payload(BaseModel):
    image: str = Field(..., description="Base64 encoded image string or data-URL")
    action: Optional[str] = Field("VERIFY", description="Action context: CHECK_IN, CHECK_OUT, or VERIFY")

class FaceVerificationResponse(BaseModel):
    verified: bool
    employee_id: str
    confidence: float
    distance: float
    message: str

class FaceRegistrationResponse(BaseModel):
    success: bool
    message: str
    quality_score: float
    sample_count: int
    model_version: str

class FaceStatusResponse(BaseModel):
    is_registered: bool
    status: str
    model_version: Optional[str] = None
    quality_score: Optional[float] = None
    sample_count: Optional[int] = None
    registered_at: Optional[str] = None
    updated_at: Optional[str] = None
