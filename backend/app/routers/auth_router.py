from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Organization
from app.schemas import TeamRegister, TeamLogin, TokenResponse
from app.auth import hash_password, verify_password, create_jwt_token

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register", response_model=TokenResponse)
def register_team(payload: TeamRegister, db: Session = Depends(get_db)):
    existing = db.query(Organization).filter(Organization.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Organization email already registered")

    org = Organization(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password)
    )
    db.add(org)
    db.commit()
    db.refresh(org)

    token = create_jwt_token({"sub": org.id, "email": org.email})
    return TokenResponse(
        access_token=token,
        team_name=org.name,
        org_id=org.id
    )

@router.post("/login", response_model=TokenResponse)
def login_team(payload: TeamLogin, db: Session = Depends(get_db)):
    org = db.query(Organization).filter(Organization.email == payload.email).first()
    if not org or not verify_password(payload.password, org.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    token = create_jwt_token({"sub": org.id, "email": org.email})
    return TokenResponse(
        access_token=token,
        team_name=org.name,
        org_id=org.id
    )

@router.get("/default-session", response_model=TokenResponse)
def get_default_session(db: Session = Depends(get_db)):
    org = db.query(Organization).filter(Organization.email == "admin@autofill.local").first()
    if not org:
        org = Organization(
            name="Default Organization",
            email="admin@autofill.local",
            password_hash=hash_password("default")
        )
        db.add(org)
        db.commit()
        db.refresh(org)

    token = create_jwt_token({"sub": org.id, "email": org.email})
    return TokenResponse(
        access_token=token,
        team_name=org.name,
        org_id=org.id
    )
