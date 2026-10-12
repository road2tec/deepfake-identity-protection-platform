import os

from dotenv import load_dotenv

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_DIR = os.path.dirname(BACKEND_DIR)

load_dotenv(os.path.join(BACKEND_DIR, ".env"))


class Settings:
    mongodb_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    db_name = os.getenv("DB_NAME", "deepfake_identity_platform")
    jwt_secret = os.getenv("JWT_SECRET", "dev-only-secret-change-me")
    jwt_algorithm = "HS256"
    jwt_expire_minutes = int(os.getenv("JWT_EXPIRE_MINUTES", "720"))
    cors_origins = [o.strip() for o in os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()]
    max_upload_mb = int(os.getenv("MAX_UPLOAD_MB", "15"))

    # Admin account created on first start (change the password after logging in)
    admin_email = os.getenv("ADMIN_EMAIL", "admin@ddip.in").strip().lower()
    admin_password = os.getenv("ADMIN_PASSWORD", "Admin@12345")
    admin_name = os.getenv("ADMIN_NAME", "Platform Admin")

    models_dir = os.path.join(PROJECT_DIR, "models")
    image_model_path = os.path.join(models_dir, "image_detector", "efficientnet_b0_faces.pt")
    image_metrics_path = os.path.join(models_dir, "image_detector", "metrics.json")
    face_detector_path = os.path.join(models_dir, "face", "face_detection_yunet_2023mar.onnx")
    face_recognizer_path = os.path.join(models_dir, "face", "face_recognition_sface_2021dec.onnx")


settings = Settings()
