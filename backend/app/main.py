import os
import logging
import traceback
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.migrate import run_migrations
from app.routers import profiles_router, extension_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smart_autofill")

# Run database schema migrations prior to create_all
try:
    run_migrations(engine)
except Exception as e:
    logger.error(f"Migration error: {e}", exc_info=True)

# Create database tables if they do not exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Smart Autofill API",
    description="Backend API powering Smart Autofill Dashboard and Chrome extension form autofill engine",
    version="2.0.0"
)

# Global Exception Handler (returns structured JSON error through CORS middleware stack)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_trace = traceback.format_exc()
    logger.error(f"Unhandled exception on {request.method} {request.url}: {exc}\n{error_trace}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": f"Internal Server Error: {str(exc)}",
            "error_type": type(exc).__name__,
            "message": str(exc)
        }
    )

# Enable CORS for dashboard web app & browser extension
cors_origins_raw = os.environ.get("CORS_ORIGINS", "*")
origins = [o.strip() for o in cors_origins_raw.split(",") if o.strip()] if cors_origins_raw != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(profiles_router.router)
app.include_router(extension_router.router)

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Smart Autofill API",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)

