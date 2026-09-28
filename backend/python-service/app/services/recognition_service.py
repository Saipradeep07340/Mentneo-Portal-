import os
import cv2
import numpy as np
from typing import Tuple, List, Optional
from app.core.config import settings
import logging

logger = logging.getLogger("mentneo.face")

class FaceRecognitionEngine:
    _instance = None

    def __init__(self):
        self.detector = None
        self.recognizer = None
        self.initialized = False
        self._initialize_models()

    def _initialize_models(self):
        detector_path = os.path.abspath(settings.FACE_DETECTOR_MODEL_PATH)
        recognizer_path = os.path.abspath(settings.FACE_RECOGNIZER_MODEL_PATH)

        if not os.path.exists(detector_path):
            raise FileNotFoundError(f"YuNet face detector model not found at {detector_path}")
        if not os.path.exists(recognizer_path):
            raise FileNotFoundError(f"SFace ArcFace recognition model not found at {recognizer_path}")

        try:
            # Initialize YuNet face detector with default resolution
            self.detector = cv2.FaceDetectorYN.create(
                model=detector_path,
                config="",
                input_size=(320, 320),
                score_threshold=0.3,
                nms_threshold=0.3,
                top_k=5000
            )
            # Initialize SFace face recognizer
            self.recognizer = cv2.FaceRecognizerSF.create(
                model=recognizer_path,
                config=""
            )
            self.initialized = True
            logger.info("Face recognition models (YuNet + SFace ArcFace) initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize face recognition models: {e}")
            raise

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def detect_faces(self, image: np.ndarray) -> np.ndarray:
        """
        Detects faces in the given BGR image.
        Returns NumPy array of detected faces or None.
        Each face row format: [x, y, w, h, x_re, y_re, x_le, y_le, x_nt, y_nt, x_rcm, y_rcm, x_lcm, y_lcm, score]
        """
        h, w = image.shape[:2]
        self.detector.setInputSize((w, h))
        _, faces = self.detector.detect(image)
        return faces

    def extract_embedding(self, image: np.ndarray, face: np.ndarray) -> np.ndarray:
        """
        Aligns and crops the face using landmark geometry and extracts a 128-d L2-normalized feature vector.
        """
        aligned_face = self.recognizer.alignCrop(image, face)
        feature = self.recognizer.feature(aligned_face)
        # Flatten and ensure float32 array
        embedding = feature.flatten().astype(np.float32)
        # Ensure L2 normalization
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
        return embedding

    def compare_embeddings(self, emb1: np.ndarray, emb2: np.ndarray) -> Tuple[bool, float, float]:
        """
        Compares two 128-d face embeddings using SFace cosine and L2 similarity.
        Returns:
            (is_match: bool, confidence_score: float [0-100%], distance: float)
        """
        emb1_2d = emb1.reshape(1, -1)
        emb2_2d = emb2.reshape(1, -1)

        cosine_sim = self.recognizer.match(emb1_2d, emb2_2d, cv2.FaceRecognizerSF_FR_COSINE)
        l2_dist = self.recognizer.match(emb1_2d, emb2_2d, cv2.FaceRecognizerSF_FR_NORM_L2)

        # Cosine distance: 1.0 - cosine_similarity
        cosine_dist = max(0.0, 1.0 - float(cosine_sim))
        
        # SFace ArcFace standard cosine threshold is ~0.363 (cosine similarity >= 0.637)
        # For attendance threshold:
        is_match = cosine_dist <= settings.FACE_MATCH_THRESHOLD
        
        # Calculate human-friendly confidence percentage (0% to 100%)
        # 1.0 similarity = 100%, 0.637 similarity = ~80%, <= 0.0 similarity = 0%
        confidence = max(0.0, min(100.0, (float(cosine_sim) * 100.0)))

        return is_match, round(confidence, 2), round(cosine_dist, 4)

face_engine = FaceRecognitionEngine.get_instance()
