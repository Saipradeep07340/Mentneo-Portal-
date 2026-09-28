import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Mentneo Face Attendance System"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://neondb_owner:npg_oCRnT0Oi7eqd@ep-long-night-b4ssl9e9-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require"
    )
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "mentneo_super_secret_production_key_2026_jwt")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Biometric Face Models
    FACE_DETECTOR_MODEL_PATH: str = os.getenv("FACE_DETECTOR_MODEL_PATH", "backend/models/weights/face_detection_yunet.onnx")
    FACE_RECOGNIZER_MODEL_PATH: str = os.getenv("FACE_RECOGNIZER_MODEL_PATH", "backend/models/weights/face_recognition_sface.onnx")
    FACE_MODEL_NAME: str = "SFace_ArcFace_128d"
    FACE_MATCH_THRESHOLD: float = float(os.getenv("FACE_MATCH_THRESHOLD", "0.363"))  # SFace cosine similarity threshold: >= 0.637 -> distance <= 0.363
    MAX_IMAGE_SIZE: int = int(os.getenv("MAX_IMAGE_SIZE", str(10 * 1024 * 1024)))   # 10MB
    
    # Attendance Policy Configuration
    TIMEZONE: str = os.getenv("TIMEZONE", "Asia/Kolkata")
    SHIFT_START: str = os.getenv("SHIFT_START", "09:00")
    SHIFT_END: str = os.getenv("SHIFT_END", "18:00")
    GRACE_PERIOD_MINUTES: int = int(os.getenv("GRACE_PERIOD_MINUTES", "15"))
    EXPECTED_WORK_MINUTES: int = int(os.getenv("EXPECTED_WORK_MINUTES", "480"))     # 8 hours
    HALF_DAY_MINUTES: int = int(os.getenv("HALF_DAY_MINUTES", "240"))               # 4 hours
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
