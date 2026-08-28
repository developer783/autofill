from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Organization, APIKey
from app.schemas import APIKeyCreate, APIKeyResponse
from app.auth import get_current_team, generate_api_key

router = APIRouter(prefix="/api-keys", tags=["API Keys"])

@router.get("", response_model=List[APIKeyResponse])
def list_api_keys(
    db: Session = Depends(get_db),
    org: Organization = Depends(get_current_team)
):
    keys = db.query(APIKey).filter(APIKey.org_id == org.id).order_by(APIKey.created_at.desc()).all()
    return [
        APIKeyResponse(
            id=k.id,
            name=k.name,
            prefix=k.prefix,
            created_at=k.created_at,
            revoked=k.revoked
        ) for k in keys
    ]

@router.post("", response_model=APIKeyResponse)
def create_api_key(
    payload: APIKeyCreate,
    db: Session = Depends(get_db),
    org: Organization = Depends(get_current_team)
):
    plain_key, key_hash, prefix = generate_api_key()
    
    key_record = APIKey(
        org_id=org.id,
        name=payload.name,
        key_hash=key_hash,
        prefix=prefix
    )
    db.add(key_record)
    db.commit()
    db.refresh(key_record)

    return APIKeyResponse(
        id=key_record.id,
        name=key_record.name,
        prefix=key_record.prefix,
        created_at=key_record.created_at,
        revoked=key_record.revoked,
        plain_key=plain_key
    )

@router.delete("/{key_id}")
def revoke_api_key(
    key_id: str,
    db: Session = Depends(get_db),
    org: Organization = Depends(get_current_team)
):
    key_record = db.query(APIKey).filter(
        APIKey.id == key_id,
        APIKey.org_id == org.id
    ).first()
    if not key_record:
        raise HTTPException(status_code=404, detail="API key not found")

    key_record.revoked = True
    db.commit()
    return {"status": "success", "message": "API key revoked successfully"}
