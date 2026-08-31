import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    CandidateProfile, LearnedField, ProfileFile,
    ProfileDetail, ProfileWorkExperience, ProfileEducation
)
from app.schemas import (
    ExtensionProfilePickerItem, ExtensionFullProfilePayload, LearnedFieldCreate,
    LearnedFieldResponse, SingleFieldUpdatePayload
)

router = APIRouter(prefix="/extension", tags=["Extension API"])

@router.get("/profiles", response_model=List[ExtensionProfilePickerItem])
def get_extension_profiles(db: Session = Depends(get_db)):
    profiles = db.query(CandidateProfile).order_by(CandidateProfile.created_at.asc()).all()
    return [
        ExtensionProfilePickerItem(
            id=p.id,
            profile_slug=p.profile_slug,
            candidate_display_name=p.candidate_display_name
        ) for p in profiles
    ]

@router.get("/profiles/{profile_id}", response_model=ExtensionFullProfilePayload)
def get_extension_profile_detail(
    profile_id: str,
    db: Session = Depends(get_db)
):
    p = db.query(CandidateProfile).filter(CandidateProfile.id == profile_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Profile not found")

    dt = p.details
    details_dict = {
        "how_did_you_hear_about_us": dt.how_did_you_hear_about_us if dt else None,
        "previously_worked_here": dt.previously_worked_here if dt else None,
        "country": dt.country if dt else None,
        "given_names": dt.given_names if dt else None,
        "family_name": dt.family_name if dt else None,
        "local_given_names": dt.local_given_names if dt else None,
        "local_family_name": dt.local_family_name if dt else None,
        "has_preferred_name": dt.has_preferred_name if dt else False,
        "preferred_name": dt.preferred_name if dt else None,
        "address_line_1": dt.address_line_1 if dt else None,
        "city": dt.city if dt else None,
        "postal_code": dt.postal_code if dt else None,
        "state": dt.state if dt else None,
        "phone_device_type": dt.phone_device_type if dt else None,
        "country_phone_code": dt.country_phone_code if dt else "+91",
        "phone_number": dt.phone_number if dt else None,
        "phone_extension": dt.phone_extension if dt else None,
        "skills": dt.skills if dt else None,
        "websites": dt.websites if dt else None,
        "linkedin_url": dt.linkedin_url if dt else None,
        "legally_authorized_to_work": dt.legally_authorized_to_work if dt else None,
        "requires_employer_support": dt.requires_employer_support if dt else None,
        "ethnicity": dt.ethnicity if dt else None,
        "gender": dt.gender if dt else None,
        "protected_veteran_status": dt.protected_veteran_status if dt else None,
        "self_id_language": dt.self_id_language if dt else None,
        "self_id_name": dt.self_id_name if dt else None,
        "employee_id": dt.employee_id if dt else None,
        "self_id_date": dt.self_id_date if dt else None,
        "disability_status": dt.disability_status if dt else None,
        "language": dt.language if dt else None,
    }

    files_dict = {}
    for f in p.files:
        files_dict[f.file_kind] = {
            "file_id": f.id,
            "filename": f.filename,
            "mimetype": f.mimetype,
            "download_url": f"/extension/profiles/{p.id}/files/{f.id}/download"
        }

    work_experience_list = [
        {
            "job_title": we.job_title,
            "company": we.company,
            "location": we.location,
            "from_date": we.from_date,
            "to_date": we.to_date,
            "currently_work_here": we.currently_work_here,
            "role_description": we.role_description
        } for we in p.work_experience
    ]

    education_list = [
        {
            "school_or_university": edu.school_or_university,
            "degree": edu.degree,
            "field_of_study": edu.field_of_study,
            "overall_result_gpa": edu.overall_result_gpa,
            "from_date": edu.from_date,
            "to_date": edu.to_date
        } for edu in p.education
    ]

    learned_list = [
        {
            "id": lf.id,
            "ats_domain": lf.ats_domain,
            "field_label_text": lf.field_label_text,
            "field_value": lf.field_value
        } for lf in p.learned_fields
    ]

    return ExtensionFullProfilePayload(
        id=p.id,
        profile_slug=p.profile_slug,
        candidate_display_name=p.candidate_display_name,
        details=details_dict,
        work_experience=work_experience_list,
        education=education_list,
        files=files_dict,
        learned_fields=learned_list
    )

@router.get("/profiles/{profile_id}/files/{file_id}/download")
def download_extension_file_blob(
    profile_id: str,
    file_id: str,
    db: Session = Depends(get_db)
):
    pf = db.query(ProfileFile).filter(
        ProfileFile.id == file_id,
        ProfileFile.profile_id == profile_id
    ).first()

    if not pf or not pf.storage_path or not os.path.exists(pf.storage_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=pf.storage_path,
        filename=pf.filename,
        media_type=pf.mimetype or "application/octet-stream"
    )

# --- Extension Push Learned Fields Endpoint (Case B Upsert) ---
@router.post("/profiles/{profile_id}/learned-fields", response_model=LearnedFieldResponse)
def push_learned_field(
    profile_id: str,
    payload: LearnedFieldCreate,
    db: Session = Depends(get_db)
):
    profile = db.query(CandidateProfile).filter(CandidateProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    existing = db.query(LearnedField).filter(
        LearnedField.profile_id == profile_id,
        LearnedField.field_label_text == payload.field_label_text
    ).first()

    if existing:
        existing.field_value = payload.field_value
        if payload.ats_domain:
            existing.ats_domain = payload.ats_domain
        db.commit()
        db.refresh(existing)
        return existing
    else:
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

# --- Case A: Single Structured Field Update Endpoint ---
@router.patch("/profiles/{profile_id}/field")
def update_extension_profile_field(
    profile_id: str,
    payload: SingleFieldUpdatePayload,
    db: Session = Depends(get_db)
):
    profile = db.query(CandidateProfile).filter(CandidateProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    fk = payload.field_key.strip()
    val = payload.value

    detail_attr = fk.replace("details.", "")
    if hasattr(ProfileDetail, detail_attr) and not detail_attr.startswith("_") and detail_attr not in ["id", "profile_id"]:
        if not profile.details:
            profile.details = ProfileDetail(profile_id=profile.id)
            db.add(profile.details)
            db.flush()

        setattr(profile.details, detail_attr, val)
        db.commit()
        return {"status": "success", "updated_field": fk, "value": val}

    if fk.startswith("work_experience"):
        try:
            emp_attr = fk.split(".")[-1]
            we_record = db.query(ProfileWorkExperience).filter(
                ProfileWorkExperience.profile_id == profile.id
            ).first()

            if not we_record:
                we_record = ProfileWorkExperience(profile_id=profile.id)
                db.add(we_record)
                db.flush()

            if hasattr(ProfileWorkExperience, emp_attr) and not emp_attr.startswith("_") and emp_attr not in ["id", "profile_id"]:
                setattr(we_record, emp_attr, val)
                db.commit()
                return {"status": "success", "updated_field": fk, "value": val}
        except Exception:
            raise HTTPException(status_code=400, detail=f"Invalid work_experience field key format: {fk}")

    if fk.startswith("education"):
        try:
            edu_attr = fk.split(".")[-1]
            edu_record = db.query(ProfileEducation).filter(
                ProfileEducation.profile_id == profile.id
            ).first()

            if not edu_record:
                edu_record = ProfileEducation(profile_id=profile.id)
                db.add(edu_record)
                db.flush()

            if hasattr(ProfileEducation, edu_attr) and not edu_attr.startswith("_") and edu_attr not in ["id", "profile_id"]:
                setattr(edu_record, edu_attr, val)
                db.commit()
                return {"status": "success", "updated_field": fk, "value": val}
        except Exception:
            raise HTTPException(status_code=400, detail=f"Invalid education field key format: {fk}")

    raise HTTPException(status_code=400, detail=f"Unknown or unsupported field key: {fk}")
