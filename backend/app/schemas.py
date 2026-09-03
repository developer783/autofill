from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

# --- Child Schemas (ALL FIELDS OPTIONAL FOR PARTIAL SAVE RULE) ---
class WorkExperienceBase(BaseModel):
    job_title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    from_date: Optional[str] = None
    to_date: Optional[str] = None
    currently_work_here: Optional[bool] = False
    role_description: Optional[str] = None

class WorkExperienceResponse(WorkExperienceBase):
    id: str
    profile_id: str
    class Config:
        from_attributes = True

class EducationBase(BaseModel):
    school_or_university: Optional[str] = None
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    overall_result_gpa: Optional[str] = None
    from_date: Optional[str] = None
    to_date: Optional[str] = None

class EducationResponse(EducationBase):
    id: str
    profile_id: str
    class Config:
        from_attributes = True

class ProfileFileResponse(BaseModel):
    id: str
    profile_id: str
    file_kind: str
    filename: str
    mimetype: Optional[str] = None
    uploaded_at: datetime
    download_url: str
    class Config:
        from_attributes = True

class LearnedFieldBase(BaseModel):
    ats_domain: Optional[str] = None
    field_label_text: str
    field_value: str

class LearnedFieldCreate(LearnedFieldBase):
    pass

class LearnedFieldResponse(LearnedFieldBase):
    id: str
    profile_id: str
    created_at: datetime
    class Config:
        from_attributes = True

# --- Profile Details (ALL NULLABLE FOR PARTIAL SAVE RULE) ---
class ProfileDetailBase(BaseModel):
    # Application Info
    how_did_you_hear_about_us: Optional[str] = None
    previously_worked_here: Optional[bool] = None

    # Legal Name
    country: Optional[str] = None
    given_names: Optional[str] = None
    family_name: Optional[str] = None
    local_given_names: Optional[str] = None
    local_family_name: Optional[str] = None
    has_preferred_name: Optional[bool] = False
    preferred_name: Optional[str] = None

    # Address
    address_line_1: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    state: Optional[str] = None

    # Email
    email_address: Optional[str] = None

    # Phone
    phone_device_type: Optional[str] = None
    country_phone_code: Optional[str] = "+91"
    phone_number: Optional[str] = None
    phone_extension: Optional[str] = None

    # Skills & Websites
    skills: Optional[str] = None
    websites: Optional[str] = None

    # Social Network URLs & Portfolio
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None

    # Work Authorization
    legally_authorized_to_work: Optional[bool] = None
    requires_employer_support: Optional[bool] = None

    # Voluntary Disclosures
    ethnicity: Optional[str] = None
    gender: Optional[str] = None
    protected_veteran_status: Optional[str] = None

    # Disability Self-Identification
    self_id_language: Optional[str] = None
    self_id_name: Optional[str] = None
    employee_id: Optional[str] = None
    self_id_date: Optional[str] = None
    disability_status: Optional[str] = None

    # Standalone Language
    language: Optional[str] = None

    class Config:
        from_attributes = True

# --- Candidate Profile Payload Schemas ---
class CandidateProfileCreate(BaseModel):
    candidate_display_name: Optional[str] = "New Candidate"
    details: Optional[ProfileDetailBase] = Field(default_factory=ProfileDetailBase)
    work_experience: Optional[List[WorkExperienceBase]] = Field(default_factory=list)
    education: Optional[List[EducationBase]] = Field(default_factory=list)
    learned_fields: Optional[List[LearnedFieldCreate]] = Field(default_factory=list)

class CandidateProfileUpdate(CandidateProfileCreate):
    pass

class CandidateProfileListItem(BaseModel):
    id: str
    profile_slug: str
    candidate_display_name: str
    updated_at: datetime
    class Config:
        from_attributes = True

class CandidateProfileFull(BaseModel):
    id: str
    profile_slug: str
    candidate_display_name: str
    created_at: datetime
    updated_at: datetime

    details: ProfileDetailBase
    work_experience: List[WorkExperienceResponse] = Field(default_factory=list)
    education: List[EducationResponse] = Field(default_factory=list)
    files: List[ProfileFileResponse] = Field(default_factory=list)
    learned_fields: List[LearnedFieldResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True

# --- Extension Specific Payload ---
class ExtensionProfilePickerItem(BaseModel):
    id: str
    profile_slug: str
    candidate_display_name: str

class ExtensionFullProfilePayload(BaseModel):
    id: str
    profile_slug: str
    candidate_display_name: str
    details: Dict[str, Any]
    work_experience: List[Dict[str, Any]]
    education: List[Dict[str, Any]]
    files: Dict[str, Any] # file_kind -> download_url metadata
    learned_fields: List[Dict[str, Any]]

class SingleFieldUpdatePayload(BaseModel):
    field_key: str
    value: Optional[Any] = None
