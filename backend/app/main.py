import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .db import close_db, ensure_admin, get_db, init_indexes
from .detectors.image_detector import detector
from .routers import admin, alerts, auth, identity, scans


def _warm_up():
    try:
        detector.load()
        print("Image model loaded.")
    except Exception as exc:  # the API still serves auth etc. without a model
        print(f"WARNING: image model not loaded: {exc}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_indexes()
        ensure_admin()
    except Exception as exc:
        print(f"WARNING: could not reach MongoDB at {settings.mongodb_url}: {exc}")
    threading.Thread(target=_warm_up, daemon=True).start()
    yield
    close_db()


app = FastAPI(title="Deepfake Detection & Digital Identity Protection API", version="0.5.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    # Turn pydantic errors into one readable sentence for the UI.
    first = exc.errors()[0] if exc.errors() else {}
    field = ".".join(str(p) for p in first.get("loc", [])[1:]) or "request"
    msg = first.get("msg", "Invalid request").removeprefix("Value error, ")
    return JSONResponse(status_code=422, content={"detail": f"{field}: {msg}", "errors": jsonable(exc.errors())})


def jsonable(errors):
    return [{"loc": e.get("loc"), "msg": str(e.get("msg"))} for e in errors]


app.include_router(auth.router)
app.include_router(scans.router)
app.include_router(identity.router)
app.include_router(alerts.router)
app.include_router(admin.router)


@app.get("/api/health")
def health():
    try:
        get_db().command("ping")
        db_ok = True
    except Exception:
        db_ok = False
    return {
        "status": "ok",
        "database": db_ok,
        "image_model_loaded": detector.loaded,
        "image_model_metrics": detector.metrics,
        "modules": {"image": "available", "identity": "available", "audio": "planned", "video": "planned"},
    }
