import datetime
import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Integer, Float
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    id = Column(String, primary_key=True, default=generate_uuid)
    profile_slug = Column(String, nullable=False, unique=True) # profile1, profile2, ...
    candidate_display_name = Column(String, default="New Candidate")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    details = relationship("ProfileDetail", back_populates="profile", uselist=False, cascade="all, delete-orphan")
    work_experience = relationship("ProfileWorkExperience", back_populates="profile", cascade="all, delete-orphan")
    education = relationship("ProfileEducation", back_populates="profile", cascade="all, delete-orphan")
    files = relationship("ProfileFile", back_populates="profile", cascade="all, delete-orphan")
    learned_fields = relationship("LearnedField", back_populates="profile", cascade="all, delete-orphan")

class ProfileDetail(Base):
    __tablename__ = "profile_details"

    id = Column(String, primary_key=True, default=generate_uuid)
    profile_id = Column(String, ForeignKey("candidate_profiles.id"), nullable=False, unique=True)

    # Application Info (ALL NULLABLE)
    how_did_you_hear_about_us = Column(String, nullable=True) # Job Board / Social Media / Website
    previously_worked_here = Column(Boolean, nullable=True)

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
    postal_code = Column(String, nullable=True)
    state = Column(String, nullable=True)

    # Contact / Email (ALL NULLABLE)
    email_address = Column(String, nullable=True)

    # Phone (ALL NULLABLE)
    phone_device_type = Column(String, nullable=True) # Home / Cellular
    country_phone_code = Column(String, default="+91", nullable=True)
    phone_number = Column(String, nullable=True)
    phone_extension = Column(String, nullable=True)

    # Skills & Websites (ALL NULLABLE)
    skills = Column(Text, nullable=True) # comma-separated list
    websites = Column(Text, nullable=True) # free text

    # Social Network URLs (ALL NULLABLE)
    linkedin_url = Column(String, nullable=True)
    github_url = Column(String, nullable=True)
    portfolio_url = Column(String, nullable=True)

    # Work Authorization (ALL NULLABLE)
    legally_authorized_to_work = Column(Boolean, nullable=True)
    requires_employer_support = Column(Boolean, nullable=True)

    # Voluntary Disclosures (ALL NULLABLE)
    ethnicity = Column(String, nullable=True) # American / Asian / African or Black / Decline to Disclose / Hispanic or Latino / White
    gender = Column(String, nullable=True)    # Male / Female
    protected_veteran_status = Column(String, nullable=True) # I identify as Veteran / I identify as Veteran, not protected / I am not a Veteran / I do not wish to identify

    # Disability Self-Identification (ALL NULLABLE)
    self_id_language = Column(String, nullable=True)
    self_id_name = Column(String, nullable=True)
    employee_id = Column(String, nullable=True)
    self_id_date = Column(String, nullable=True)
    disability_status = Column(String, nullable=True) # Yes... / No... / I do not want to answer

    # Standalone Language (ALL NULLABLE)
    language = Column(String, nullable=True)

    profile = relationship("CandidateProfile", back_populates="details")

class ProfileWorkExperience(Base):
    __tablename__ = "profile_work_experience"

    id = Column(String, primary_key=True, default=generate_uuid)
    profile_id = Column(String, ForeignKey("candidate_profiles.id"), nullable=False)
    job_title = Column(String, nullable=True)
    company = Column(String, nullable=True)
    location = Column(String, nullable=True)
    from_date = Column(String, nullable=True)
    to_date = Column(String, nullable=True)
    currently_work_here = Column(Boolean, default=False, nullable=True)
    role_description = Column(Text, nullable=True)

    profile = relationship("CandidateProfile", back_populates="work_experience")

class ProfileEducation(Base):
    __tablename__ = "profile_education"

    id = Column(String, primary_key=True, default=generate_uuid)
    profile_id = Column(String, ForeignKey("candidate_profiles.id"), nullable=False)
    school_or_university = Column(String, nullable=True)
    degree = Column(String, nullable=True)
    field_of_study = Column(String, nullable=True)
    overall_result_gpa = Column(String, nullable=True)
    from_date = Column(String, nullable=True)
    to_date = Column(String, nullable=True)

    profile = relationship("CandidateProfile", back_populates="education")

class ProfileFile(Base):
    __tablename__ = "profile_files"

    id = Column(String, primary_key=True, default=generate_uuid)
    profile_id = Column(String, ForeignKey("candidate_profiles.id"), nullable=False)
    file_kind = Column(String, nullable=False, default="resume") # resume only
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

class ATSFieldMapping(Base):
    __tablename__ = "ats_field_mappings"

    id = Column(String, primary_key=True, default=generate_uuid)
    ats_domain = Column(String, nullable=True, index=True)
    field_signature_hash = Column(String, nullable=False, index=True)
    resolved_profile_key = Column(String, nullable=True) # null for confirmed no-match
    confidence = Column(Float, default=1.0)
    source = Column(String, default="ai") # ai | heuristic | manual
    verified_count = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

