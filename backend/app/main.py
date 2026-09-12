"""
AutoPredict AI - FastAPI Application Entrypoint.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes import api_router
from app.services.database import init_db
from app.ml.simulator import get_presets
from app.services.prediction_service import PredictionService
from app.services.database import SessionLocal


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize SQLite database tables
    print("[AutoPredict AI] Starting backend server...")
    init_db()
    print("[AutoPredict AI] SQLite database initialized.")
    
    # Pre-populate initial demo run if database is empty
    db = SessionLocal()
    try:
        existing = PredictionService.get_history(db, limit=1)
        if not existing:
            print("[AutoPredict AI] Seeding initial baseline telemetry run into database...")
            presets = get_presets()
            for p in presets[:2]:
                PredictionService.run_prediction(p.data, db=db, persist=True)
    finally:
        db.close()

    yield
    print("[AutoPredict AI] Backend shutting down.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AI-powered Vehicle Health and Predictive Maintenance Platform API",
    lifespan=lifespan,
)

# Configure Cross-Origin Resource Sharing (CORS) for Vite / React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits local development on any port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes under /api
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "health_check": f"{settings.API_V1_STR}/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
