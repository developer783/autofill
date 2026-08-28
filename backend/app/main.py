import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import Base, engine
from app.routers import auth_router, profiles_router, apikeys_router, extension_router

# Create database tables if they do not exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ATS Candidate Autofill API",
    description="Backend API powering the Dashboard web app and Chrome extension form autofill engine",
    version="1.0.0"
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
app.include_router(auth_router.router)
app.include_router(profiles_router.router)
app.include_router(apikeys_router.router)
app.include_router(extension_router.router)

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "ATS Candidate Autofill API",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
