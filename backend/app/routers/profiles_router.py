import os
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    Organization, CandidateProfile, ProfileDetail, ProfileEmployment,
    ProfileEducation, ProfileFile, LearnedField
)
from app.schemas import (
    CandidateProfileListItem, CandidateProfileFull, CandidateProfileCreate, CandidateProfileUpdate,
    LearnedFieldCreate, LearnedFieldResponse, ProfileFileResponse
)
from app.auth import get_current_team

router = APIRouter(prefix="/profiles", tags=["Profiles"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def generate_next_slug(db: Session, org_id: str) -> str:
    count = db.query(CandidateProfile).filter(CandidateProfile.org_id == org_id).count()
    return f"profile{count + 1}"

@router.get("", response_model=List[CandidateProfileListItem])
def list_profiles(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    org: Organization = Depends(get_current_team)
):
    query = db.query(CandidateProfile).filter(CandidateProfile.org_id == org.id)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            (CandidateProfile.profile_slug.ilike(pattern)) |
            (CandidateProfile.candidate_display_name.ilike(pattern))
        )
    profiles = query.order_by(CandidateProfile.created_at.asc()).all()
    return profiles

@router.post("", response_model=CandidateProfileFull)
def create_profile(
    payload: Optional[CandidateProfileCreate] = None,
    db: Session = Depends(get_db),
    org: Organization = Depends(get_current_team)
):
    slug = generate_next_slug(db, org.id)
    display_name = payload.candidate_display_name if payload else f"Candidate {slug.capitalize()}"
    if not display_name or display_name == "New Candidate":
        display_name = f"Candidate {slug.capitalize()}"

    profile = CandidateProfile(
        org_id=org.id,
        profile_slug=slug,
        candidate_display_name=display_name
    )
    db.add(profile)
    db.flush()

    # Create empty detail record
    dt_data = payload.details.model_dump() if payload and payload.details else {}
    detail = ProfileDetail(profile_id=profile.id, **dt_data)
    db.add(detail)

    # Employment records
    if payload and payload.employment:
        for idx, emp in enumerate(payload.employment[:2]):
            db.add(ProfileEmployment(profile_id=profile.id, position=idx+1, **emp.model_dump()))

    # Education records
    if payload and payload.education:
        for edu in payload.education:
            db.add(ProfileEducation(profile_id=profile.id, **edu.model_dump()))

    # Learned fields
    if payload and payload.learned_fields:
        for lf in payload.learned_fields:
            db.add(LearnedField(profile_id=profile.id, **lf.model_dump()))

    db.commit()
    db.refresh(profile)
    return get_full_profile_response(profile, db)

@router.get("/{profile_id}", response_model=CandidateProfileFull)
def get_profile(
    profile_id: str,
    db: Session = Depends(get_db),
    org: Organization = Depends(get_current_team)
):
    profile = db.query(CandidateProfile).filter(
        CandidateProfile.id == profile_id,
        CandidateProfile.org_id == org.id
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return get_full_profile_response(profile, db)

@router.put("/{profile_id}", response_model=CandidateProfileFull)
def update_profile(
    profile_id: str,
    payload: CandidateProfileUpdate,
    db: Session = Depends(get_db),
    org: Organization = Depends(get_current_team)
):
    profile = db.query(CandidateProfile).filter(
        CandidateProfile.id == profile_id,
        CandidateProfile.org_id == org.id
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if payload.candidate_display_name:
        profile.candidate_display_name = payload.candidate_display_name

    # Update ProfileDetail (Partial Save - zero validation blocking!)
    if not profile.details:
        profile.details = ProfileDetail(profile_id=profile.id)

    if payload.details:
        for field, val in payload.details.model_dump(exclude_unset=True).items():
            setattr(profile.details, field, val)

    # Replace employment (up to 2)
    db.query(ProfileEmployment).filter(ProfileEmployment.profile_id == profile_id).delete()
    if payload.employment:
        for idx, emp in enumerate(payload.employment[:2]):
            db.add(ProfileEmployment(profile_id=profile_id, position=idx+1, **emp.model_dump()))

    # Replace education
    db.query(ProfileEducation).filter(ProfileEducation.profile_id == profile_id).delete()
    if payload.education:
        for edu in payload.education:
            db.add(ProfileEducation(profile_id=profile_id, **edu.model_dump()))

    db.commit()
    db.refresh(profile)
    return get_full_profile_response(profile, db)

@router.delete("/{profile_id}")
def delete_profile(
    profile_id: str,
    db: Session = Depends(get_db),
    org: Organization = Depends(get_current_team)
):
    profile = db.query(CandidateProfile).filter(
        CandidateProfile.id == profile_id,
        CandidateProfile.org_id == org.id
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Clean up uploaded files
    for pf in profile.files:
        if pf.storage_path and os.path.exists(pf.storage_path):
            try:
                os.remove(pf.storage_path)
            except Exception:
                pass

    db.delete(profile)
    db.commit()
    return {"status": "success", "message": "Profile deleted successfully"}

from app.storage import storage_service

# --- Multi-Kind File Upload Endpoint ---
@router.post("/{profile_id}/files", response_model=ProfileFileResponse)
def upload_profile_file(
    profile_id: str,
    file_kind: str = Form(...), # resume | cover_letter | portfolio_document
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    org: Organization = Depends(get_current_team)
):
    profile = db.query(CandidateProfile).filter(
        CandidateProfile.id == profile_id,
        CandidateProfile.org_id == org.id
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    file_ext = os.path.splitext(file.filename)[1]
    safe_filename = f"{profile_id}_{file_kind}{file_ext}"

    storage_path_or_key, _ = storage_service.save_file(file.file, safe_filename, file.content_type)

    # Re-uploading same kind replaces previous file entry
    existing_file = db.query(ProfileFile).filter(
        ProfileFile.profile_id == profile_id,
        ProfileFile.file_kind == file_kind
    ).first()

    if existing_file:
        existing_file.filename = file.filename
        existing_file.mimetype = file.content_type
        existing_file.storage_path = storage_path_or_key
        db.commit()
        db.refresh(existing_file)
        file_record = existing_file
    else:
        file_record = ProfileFile(
            profile_id=profile_id,
            file_kind=file_kind,
            filename=file.filename,
            mimetype=file.content_type,
            storage_path=storage_path_or_key
        )
        db.add(file_record)
        db.commit()
        db.refresh(file_record)

    return ProfileFileResponse(
        id=file_record.id,
        profile_id=file_record.profile_id,
        file_kind=file_record.file_kind,
        filename=file_record.filename,
        mimetype=file_record.mimetype,
        uploaded_at=file_record.uploaded_at,
        download_url=f"/profiles/{profile_id}/files/{file_record.id}/download"
    )

@router.get("/{profile_id}/files/{file_id}/download")
def download_profile_file(
    profile_id: str,
    file_id: str,
    db: Session = Depends(get_db)
):
    pf = db.query(ProfileFile).filter(
        ProfileFile.id == file_id,
        ProfileFile.profile_id == profile_id
    ).first()
    if not pf or not pf.storage_path:
        raise HTTPException(status_code=404, detail="File not found")

    local_path = storage_service.get_file_path(pf.storage_path)
    if not local_path:
        raise HTTPException(status_code=404, detail="File not found on storage backend")

    return FileResponse(
        path=local_path,
        filename=pf.filename,
        media_type=pf.mimetype or "application/octet-stream"
    )

# --- Learned Fields Management ---
@router.post("/{profile_id}/learned-fields", response_model=LearnedFieldResponse)
def add_learned_field(
    profile_id: str,
    payload: LearnedFieldCreate,
    db: Session = Depends(get_db),
    org: Organization = Depends(get_current_team)
):
    profile = db.query(CandidateProfile).filter(
        CandidateProfile.id == profile_id,
        CandidateProfile.org_id == org.id
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    lf = LearnedField(
        profile_id=profile_id,
        ats_domain=payload.ats_domain,
        field_label_text=payload.field_label_text,
        field_value=payload.field_value
    )
    db.add(lf)
    db.commit()
    db.refresh(lf)
    return lf

@router.delete("/{profile_id}/learned-fields/{field_id}")
def delete_learned_field(
    profile_id: str,
    field_id: str,
    db: Session = Depends(get_db),
    org: Organization = Depends(get_current_team)
):
    lf = db.query(LearnedField).filter(
        LearnedField.id == field_id,
        LearnedField.profile_id == profile_id
    ).first()
    if not lf:
        raise HTTPException(status_code=404, detail="Learned field not found")

    db.delete(lf)
    db.commit()
    return {"status": "success", "message": "Learned field deleted"}

def get_full_profile_response(profile: CandidateProfile, db: Session) -> CandidateProfileFull:
    if not profile.details:
        profile.details = ProfileDetail(profile_id=profile.id)
        db.add(profile.details)
        db.commit()
        db.refresh(profile)

    file_responses = [
        ProfileFileResponse(
            id=f.id,
            profile_id=f.profile_id,
            file_kind=f.file_kind,
            filename=f.filename,
            mimetype=f.mimetype,
            uploaded_at=f.uploaded_at,
            download_url=f"/profiles/{profile.id}/files/{f.id}/download"
        ) for f in profile.files
    ]

    from app.schemas import ProfileDetailBase

    return CandidateProfileFull(
        id=profile.id,
        org_id=profile.org_id,
        profile_slug=profile.profile_slug,
        candidate_display_name=profile.candidate_display_name,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
        details=ProfileDetailBase.model_validate(profile.details),
        employment=profile.employment,
        education=profile.education,
        files=file_responses,
        learned_fields=profile.learned_fields
    )
