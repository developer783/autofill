from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

# --- Auth Schemas ---
class TeamRegister(BaseModel):
    name: str
    email: EmailStr
    password: str

class TeamLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    team_name: str
    org_id: str

# --- API Key Schemas ---
class APIKeyCreate(BaseModel):
    name: str = "Extension Key"

class APIKeyResponse(BaseModel):
    id: str
    name: str
    prefix: str
    created_at: datetime
    revoked: bool
    plain_key: Optional[str] = None

# --- Child Schemas (ALL FIELDS OPTIONAL / NULLABLE FOR PARTIAL SAVES) ---
class EmploymentBase(BaseModel):
    position: Optional[int] = 1
    job_title: Optional[str] = ""
    company: Optional[str] = ""
    location: Optional[str] = ""
    from_date: Optional[str] = ""
    to_date: Optional[str] = ""
    currently_work_here: Optional[bool] = False
    role_description: Optional[str] = ""

class EmploymentResponse(EmploymentBase):
    id: str
    profile_id: str
    class Config:
        from_attributes = True

class EducationBase(BaseModel):
    school_or_university: Optional[str] = ""
    degree: Optional[str] = ""
    field_of_study: Optional[str] = ""
    overall_result_gpa: Optional[str] = ""
    from_year: Optional[str] = ""
    to_year: Optional[str] = ""

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
    state_province: Optional[str] = None
    postal_code: Optional[str] = None
    email_address: Optional[str] = None

    # Phone
    phone_device_type: Optional[str] = None
    country_phone_code: Optional[str] = "+91"
    phone_number: Optional[str] = None
    phone_extension: Optional[str] = None

    # Languages
    languages: Optional[str] = None

    # Links & Work Auth
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    work_authorization: Optional[str] = None

    # Voluntary Disclosures
    gender: Optional[str] = None
    race_ethnicity: Optional[str] = None
    hispanic_latino: Optional[str] = None
    veteran_status: Optional[str] = None
    disability_status: Optional[str] = None

    # AI Answer Profile
    default_custom_answer: Optional[str] = None

    class Config:
        from_attributes = True

# --- Candidate Profile Payload Schemas ---
class CandidateProfileCreate(BaseModel):
    candidate_display_name: Optional[str] = "New Candidate"
    details: Optional[ProfileDetailBase] = Field(default_factory=ProfileDetailBase)
    employment: Optional[List[EmploymentBase]] = Field(default_factory=list)
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
    org_id: str
    profile_slug: str
    candidate_display_name: str
    created_at: datetime
    updated_at: datetime

    details: ProfileDetailBase
    employment: List[EmploymentResponse] = Field(default_factory=list)
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
    employment: List[Dict[str, Any]]
    education: List[Dict[str, Any]]
    files: Dict[str, Any] # file_kind -> download_url metadata
    learned_fields: List[Dict[str, Any]]

class SingleFieldUpdatePayload(BaseModel):
    field_key: str
    value: Optional[Any] = None
