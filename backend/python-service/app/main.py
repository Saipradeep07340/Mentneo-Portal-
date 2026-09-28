import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from zoneinfo import ZoneInfo
from datetime import datetime

from app.core.config import settings
from app.core.database import get_db
from app.services.recognition_service import face_engine
from app.api.auth import router as auth_router
from app.api.face import router as face_router
from app.api.attendance import router as attendance_router
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("mentneo.fastapi")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Mentneo Face Recognition & Attendance FastAPI Backend...")
    # 1. Test database connection
    try:
        with get_db() as cur:
            cur.execute("SELECT 1;")
        logger.info("PostgreSQL database connection verified successfully.")
    except Exception as e:
        logger.error(f"Failed to connect to PostgreSQL database: {e}")

    # 2. Preload face models
    try:
        if face_engine.initialized:
            logger.info("YuNet face detector and SFace ArcFace recognizer are loaded and ready.")
    except Exception as e:
        logger.error(f"Error checking face recognition models: {e}")

    yield

    logger.info("Shutting down Mentneo FastAPI Backend.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production Face Recognition & Automated Employee Attendance System for Mentneo",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5000",
        "http://127.0.0.1:5000",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health Checks
@app.get("/health")
@app.get("/api/health")
async def health_check():
    tz = ZoneInfo(settings.TIMEZONE)
    server_time = datetime.now(tz).isoformat()
    db_ok = False
    try:
        with get_db() as cur:
            cur.execute("SELECT 1;")
            db_ok = True
    except Exception:
        db_ok = False

    return {
        "status": "healthy" if db_ok and face_engine.initialized else "degraded",
        "ok": True,
        "message": "Mentneo FastAPI Face & Attendance Backend is operational",
        "database": "connected" if db_ok else "disconnected",
        "faceModels": {
            "loaded": face_engine.initialized,
            "detector": "YuNet",
            "recognizer": settings.FACE_MODEL_NAME
        },
        "timezone": settings.TIMEZONE,
        "serverTime": server_time,
        "version": settings.VERSION
    }

# Mount Primary Routers
app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(face_router, prefix=settings.API_PREFIX)
app.include_router(attendance_router, prefix=settings.API_PREFIX)

# Also mount under /api/employee aliases for backward-compatible routing
app.include_router(face_router, prefix="/api/employee")
app.include_router(attendance_router, prefix="/api/employee")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again later."}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
