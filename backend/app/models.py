import datetime
import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Integer, JSON
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    api_keys = relationship("APIKey", back_populates="org", cascade="all, delete-orphan")
    profiles = relationship("CandidateProfile", back_populates="org", cascade="all, delete-orphan")

class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(String, primary_key=True, default=generate_uuid)
    org_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    name = Column(String, nullable=False, default="Default Extension Key")
    key_hash = Column(String, nullable=False, index=True)
    prefix = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    revoked = Column(Boolean, default=False)

    org = relationship("Organization", back_populates="api_keys")

class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    id = Column(String, primary_key=True, default=generate_uuid)
    org_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    profile_slug = Column(String, nullable=False) # profile1, profile2, ...
    candidate_display_name = Column(String, default="New Candidate")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    org = relationship("Organization", back_populates="profiles")
    details = relationship("ProfileDetail", back_populates="profile", uselist=False, cascade="all, delete-orphan")
    employment = relationship("ProfileEmployment", back_populates="profile", cascade="all, delete-orphan")
    education = relationship("ProfileEducation", back_populates="profile", cascade="all, delete-orphan")
    files = relationship("ProfileFile", back_populates="profile", cascade="all, delete-orphan")
    learned_fields = relationship("LearnedField", back_populates="profile", cascade="all, delete-orphan")

class ProfileDetail(Base):
    __tablename__ = "profile_details"

    id = Column(String, primary_key=True, default=generate_uuid)
    profile_id = Column(String, ForeignKey("candidate_profiles.id"), nullable=False, unique=True)

    # Legal Name (ALL NULLABLE)
    country = Column(String, nullable=True)
    given_names = Column(String, nullable=True)
    family_name = Column(String, nullable=True)
    local_given_names = Column(String, nullable=True)
    local_family_name = Column(String, nullable=True)
    has_preferred_name = Column(Boolean, default=False, nullable=True)
    preferred_name = Column(String, nullable=True)

    # Address (ALL NULLABLE)
    address_line_1 = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state_province = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)
    email_address = Column(String, nullable=True)

    # Phone (ALL NULLABLE)
    phone_device_type = Column(String, nullable=True)
    country_phone_code = Column(String, default="+91", nullable=True)
    phone_number = Column(String, nullable=True)
    phone_extension = Column(String, nullable=True)

    # Languages (NULLABLE)
    languages = Column(Text, nullable=True)

    # Links & Work Auth (ALL NULLABLE)
    linkedin_url = Column(String, nullable=True)
    github_url = Column(String, nullable=True)
    portfolio_url = Column(String, nullable=True)
    work_authorization = Column(Text, nullable=True)

    # Voluntary Disclosures (ALL NULLABLE)
    gender = Column(String, nullable=True)
    race_ethnicity = Column(String, nullable=True)
    hispanic_latino = Column(String, nullable=True)
    veteran_status = Column(String, nullable=True)
    disability_status = Column(String, nullable=True)

    # AI Answer Profile (NULLABLE)
    default_custom_answer = Column(Text, nullable=True)

    profile = relationship("CandidateProfile", back_populates="details")

class ProfileEmployment(Base):
    __tablename__ = "profile_employment"

    id = Column(String, primary_key=True, default=generate_uuid)
    profile_id = Column(String, ForeignKey("candidate_profiles.id"), nullable=False)
    position = Column(Integer, default=1) # 1 or 2
    job_title = Column(String, nullable=True)
    company = Column(String, nullable=True)
    location = Column(String, nullable=True)
    from_date = Column(String, nullable=True) # MM/YYYY
    to_date = Column(String, nullable=True)   # MM/YYYY
    currently_work_here = Column(Boolean, default=False)
    role_description = Column(Text, nullable=True)

    profile = relationship("CandidateProfile", back_populates="employment")

class ProfileEducation(Base):
    __tablename__ = "profile_education"

    id = Column(String, primary_key=True, default=generate_uuid)
    profile_id = Column(String, ForeignKey("candidate_profiles.id"), nullable=False)
    school_or_university = Column(String, nullable=True)
    degree = Column(String, nullable=True)
    field_of_study = Column(String, nullable=True)
    overall_result_gpa = Column(String, nullable=True)
    from_year = Column(String, nullable=True)
    to_year = Column(String, nullable=True)

    profile = relationship("CandidateProfile", back_populates="education")

class ProfileFile(Base):
    __tablename__ = "profile_files"

    id = Column(String, primary_key=True, default=generate_uuid)
    profile_id = Column(String, ForeignKey("candidate_profiles.id"), nullable=False)
    file_kind = Column(String, nullable=False) # resume | cover_letter | portfolio_document
    filename = Column(String, nullable=False)
    mimetype = Column(String, nullable=True)
    storage_path = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

    profile = relationship("CandidateProfile", back_populates="files")

class LearnedField(Base):
    __tablename__ = "learned_fields"

    id = Column(String, primary_key=True, default=generate_uuid)
    profile_id = Column(String, ForeignKey("candidate_profiles.id"), nullable=False)
    ats_domain = Column(String, nullable=True)
    field_label_text = Column(String, nullable=False)
    field_value = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    profile = relationship("CandidateProfile", back_populates="learned_fields")
