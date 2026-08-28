import hashlib
import secrets
import datetime
from typing import Optional
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import jwt

from app.database import get_db
from app.models import Organization, APIKey

SECRET_KEY = "ats_autofill_super_secret_jwt_key_change_in_prod"
ALGORITHM = "HS256"

security = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

def create_jwt_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + (expires_delta or datetime.timedelta(days=7))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def generate_api_key() -> tuple[str, str, str]:
    """Generates (plain_key, key_hash, prefix)"""
    raw_token = secrets.token_hex(20)
    plain_key = f"ats_live_{raw_token}"
    prefix = plain_key[:12] + "..."
    key_hash = hashlib.sha256(plain_key.encode("utf-8")).hexdigest()
    return plain_key, key_hash, prefix

def hash_api_key(plain_key: str) -> str:
    return hashlib.sha256(plain_key.strip().encode("utf-8")).hexdigest()

def ensure_default_api_key(db: Session, org: Organization) -> APIKey:
    plain_key = "ats_live_default_key_1234567890"
    key_hash = hash_api_key(plain_key)
    prefix = plain_key[:12] + "..."

    existing_key = db.query(APIKey).filter(
        APIKey.org_id == org.id,
        APIKey.key_hash == key_hash,
        APIKey.revoked == False
    ).first()
    if existing_key:
        return existing_key

    default_key = APIKey(
        org_id=org.id,
        name="Default Extension Key",
        key_hash=key_hash,
        prefix=prefix,
        revoked=False
    )
    db.add(default_key)
    db.commit()
    db.refresh(default_key)
    return default_key

def get_current_team(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Organization:
    org = db.query(Organization).first()
    if not org:
        org = Organization(name="Default Organization", email="admin@autofill.local", password_hash=hash_password("default"))
        db.add(org)
        db.commit()
        db.refresh(org)

    ensure_default_api_key(db, org)
    return org

def get_team_from_api_key(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Organization:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Extension API key missing. Pass 'Authorization: Bearer <api_key>' header."
        )

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header format. Expected 'Bearer <api_key>'"
        )

    plain_key = parts[1]
    key_hash = hash_api_key(plain_key)

    api_key_record = db.query(APIKey).filter(
        APIKey.key_hash == key_hash,
        APIKey.revoked == False
    ).first()

    if not api_key_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked API key"
        )

    org = db.query(Organization).filter(Organization.id == api_key_record.org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Associated organization not found"
        )

    return org
