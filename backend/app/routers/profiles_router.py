import os
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    CandidateProfile, ProfileDetail, ProfileWorkExperience,
    ProfileEducation, ProfileFile, LearnedField
)
from app.schemas import (
    CandidateProfileListItem, CandidateProfileFull, CandidateProfileCreate, CandidateProfileUpdate,
    LearnedFieldCreate, LearnedFieldResponse, ProfileFileResponse
)
from app.storage import storage_service

router = APIRouter(prefix="/profiles", tags=["Profiles"])

MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 # 5MB limit per spec

def generate_next_slug(db: Session) -> str:
    profiles = db.query(CandidateProfile.profile_slug).all()
    max_num = 0
    for (slug,) in profiles:
        if slug:
            match = re.search(r'profile(\d+)', slug, re.IGNORECASE)
            if match:
                num = int(match.group(1))
                if num > max_num:
                    max_num = num
    return f"profile{max_num + 1}"

@router.get("", response_model=List[CandidateProfileListItem])
def list_profiles(
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(CandidateProfile)
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
    db: Session = Depends(get_db)
):
    slug = generate_next_slug(db)
    display_name = payload.candidate_display_name if (payload and payload.candidate_display_name) else f"Candidate {slug.capitalize()}"
    if not display_name or display_name == "New Candidate":
        display_name = f"Candidate {slug.capitalize()}"

    profile = CandidateProfile(
        profile_slug=slug,
        candidate_display_name=display_name
    )
    db.add(profile)
    db.flush()

    # Create empty detail record
    dt_data = payload.details.model_dump(exclude_unset=True) if payload and payload.details else {}
    detail = ProfileDetail(profile_id=profile.id, **dt_data)
    db.add(detail)

    # Work experience record (reference form has 1 entry)
    if payload and payload.work_experience:
        for we in payload.work_experience[:1]:
            db.add(ProfileWorkExperience(profile_id=profile.id, **we.model_dump(exclude_unset=True)))
    else:
        db.add(ProfileWorkExperience(profile_id=profile.id))

    # Education record
    if payload and payload.education:
        for edu in payload.education:
            db.add(ProfileEducation(profile_id=profile.id, **edu.model_dump(exclude_unset=True)))
    else:
        db.add(ProfileEducation(profile_id=profile.id))

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
    db: Session = Depends(get_db)
):
    profile = db.query(CandidateProfile).filter(CandidateProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return get_full_profile_response(profile, db)

@router.put("/{profile_id}", response_model=CandidateProfileFull)
def update_profile(
    profile_id: str,
    payload: CandidateProfileUpdate,
    db: Session = Depends(get_db)
):
    profile = db.query(CandidateProfile).filter(CandidateProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if payload.candidate_display_name:
        profile.candidate_display_name = payload.candidate_display_name

    # Update ProfileDetail (Partial Save Rule - zero validation blocking!)
    if not profile.details:
        profile.details = ProfileDetail(profile_id=profile.id)
        db.add(profile.details)
        db.flush()

    if payload.details:
        for field, val in payload.details.model_dump(exclude_unset=True).items():
            setattr(profile.details, field, val)

    # Update Work Experience
    db.query(ProfileWorkExperience).filter(ProfileWorkExperience.profile_id == profile_id).delete()
    if payload.work_experience:
        for we in payload.work_experience[:1]:
            db.add(ProfileWorkExperience(profile_id=profile_id, **we.model_dump(exclude_unset=True)))
    else:
        db.add(ProfileWorkExperience(profile_id=profile_id))

    # Update Education
    db.query(ProfileEducation).filter(ProfileEducation.profile_id == profile_id).delete()
    if payload.education:
        for edu in payload.education:
            db.add(ProfileEducation(profile_id=profile_id, **edu.model_dump(exclude_unset=True)))
    else:
        db.add(ProfileEducation(profile_id=profile_id))

    db.commit()
    db.refresh(profile)
    return get_full_profile_response(profile, db)

@router.delete("/{profile_id}")
def delete_profile(
    profile_id: str,
    db: Session = Depends(get_db)
):
    profile = db.query(CandidateProfile).filter(CandidateProfile.id == profile_id).first()
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

# --- Resume File Upload Endpoint (5MB Limit) ---
@router.post("/{profile_id}/files", response_model=ProfileFileResponse)
async def upload_profile_file(
    profile_id: str,
    file_kind: str = Form("resume"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    profile = db.query(CandidateProfile).filter(CandidateProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if file_kind != "resume":
        file_kind = "resume" # strictly resume only per reference form spec

    # Check 5MB size limit
    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File size exceeds 5MB limit")
    
    # Seek back to 0 for storage service
    file.file.seek(0)

    file_ext = os.path.splitext(file.filename)[1]
    safe_filename = f"{profile_id}_{file_kind}{file_ext}"

    storage_path_or_key, _ = storage_service.save_file(file.file, safe_filename, file.content_type)

    # Re-uploading replaces previous resume file entry
    existing_file = db.query(ProfileFile).filter(
        ProfileFile.profile_id == profile_id,
        ProfileFile.file_kind == file_kind
    ).first()

    if existing_file:
        import datetime
        existing_file.filename = file.filename
        existing_file.mimetype = file.content_type
        existing_file.storage_path = storage_path_or_key
        existing_file.uploaded_at = datetime.datetime.utcnow()
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
    db: Session = Depends(get_db)
):
    profile = db.query(CandidateProfile).filter(CandidateProfile.id == profile_id).first()
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
    db: Session = Depends(get_db)
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

    from app.schemas import ProfileDetailBase, WorkExperienceResponse, EducationResponse

    we_responses = [WorkExperienceResponse.model_validate(we) for we in profile.work_experience]
    edu_responses = [EducationResponse.model_validate(ed) for ed in profile.education]

    return CandidateProfileFull(
        id=profile.id,
        profile_slug=profile.profile_slug,
        candidate_display_name=profile.candidate_display_name,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
        details=ProfileDetailBase.model_validate(profile.details),
        work_experience=we_responses,
        education=edu_responses,
        files=file_responses,
        learned_fields=profile.learned_fields
    )
