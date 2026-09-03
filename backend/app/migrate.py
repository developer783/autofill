import logging
from sqlalchemy import inspect, text, Engine

logger = logging.getLogger("smart_autofill.migrate")

def run_migrations(engine: Engine):
    """
    Idempotent schema migration runner to synchronize the database schema
    with current ORM definitions in app/models.py.
    """
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    is_postgres = engine.dialect.name == "postgresql"

    with engine.begin() as conn:
        logger.info(f"Running database migrations for dialect: {engine.dialect.name}")

        # 1. Rename table profile_employment -> profile_work_experience if needed
        if "profile_employment" in existing_tables and "profile_work_experience" not in existing_tables:
            logger.info("Renaming table profile_employment to profile_work_experience")
            conn.execute(text("ALTER TABLE profile_employment RENAME TO profile_work_experience"))
            existing_tables.append("profile_work_experience")

        # Refresh table listing after rename
        inspector = inspect(engine)

        # 2. Migrate profile_details columns
        if "profile_details" in existing_tables:
            detail_cols = {col["name"]: col for col in inspector.get_columns("profile_details")}

            # Column Renames
            if "state_province" in detail_cols and "state" not in detail_cols:
                logger.info("Renaming column state_province to state in profile_details")
                conn.execute(text("ALTER TABLE profile_details RENAME COLUMN state_province TO state"))
                detail_cols["state"] = detail_cols.pop("state_province")

            if "race_ethnicity" in detail_cols and "ethnicity" not in detail_cols:
                logger.info("Renaming column race_ethnicity to ethnicity in profile_details")
                conn.execute(text("ALTER TABLE profile_details RENAME COLUMN race_ethnicity TO ethnicity"))
                detail_cols["ethnicity"] = detail_cols.pop("race_ethnicity")

            if "veteran_status" in detail_cols and "protected_veteran_status" not in detail_cols:
                logger.info("Renaming column veteran_status to protected_veteran_status in profile_details")
                conn.execute(text("ALTER TABLE profile_details RENAME COLUMN veteran_status TO protected_veteran_status"))
                detail_cols["protected_veteran_status"] = detail_cols.pop("veteran_status")

            # Add missing columns
            expected_details = [
                ("how_did_you_hear_about_us", "VARCHAR"),
                ("previously_worked_here", "BOOLEAN"),
                ("country", "VARCHAR"),
                ("given_names", "VARCHAR"),
                ("family_name", "VARCHAR"),
                ("local_given_names", "VARCHAR"),
                ("local_family_name", "VARCHAR"),
                ("has_preferred_name", "BOOLEAN DEFAULT FALSE"),
                ("preferred_name", "VARCHAR"),
                ("address_line_1", "VARCHAR"),
                ("city", "VARCHAR"),
                ("postal_code", "VARCHAR"),
                ("state", "VARCHAR"),
                ("email_address", "VARCHAR"),
                ("phone_device_type", "VARCHAR"),
                ("country_phone_code", "VARCHAR DEFAULT '+91'"),
                ("phone_number", "VARCHAR"),
                ("phone_extension", "VARCHAR"),
                ("skills", "TEXT"),
                ("websites", "TEXT"),
                ("linkedin_url", "VARCHAR"),
                ("github_url", "VARCHAR"),
                ("portfolio_url", "VARCHAR"),
                ("legally_authorized_to_work", "BOOLEAN"),
                ("requires_employer_support", "BOOLEAN"),
                ("ethnicity", "VARCHAR"),
                ("gender", "VARCHAR"),
                ("protected_veteran_status", "VARCHAR"),
                ("self_id_language", "VARCHAR"),
                ("self_id_name", "VARCHAR"),
                ("employee_id", "VARCHAR"),
                ("self_id_date", "VARCHAR"),
                ("disability_status", "VARCHAR"),
                ("language", "VARCHAR"),
            ]

            for col_name, col_type in expected_details:
                if col_name not in detail_cols:
                    logger.info(f"Adding column {col_name} to profile_details")
                    conn.execute(text(f"ALTER TABLE profile_details ADD COLUMN {col_name} {col_type}"))

            # Drop old obsolete columns in PostgreSQL
            if is_postgres:
                obsolete_details = ["languages", "work_authorization", "hispanic_latino", "default_custom_answer"]
                for obs in obsolete_details:
                    if obs in detail_cols:
                        logger.info(f"Dropping obsolete column {obs} from profile_details")
                        conn.execute(text(f"ALTER TABLE profile_details DROP COLUMN IF EXISTS {obs} CASCADE"))

        # 3. Migrate profile_education columns
        if "profile_education" in existing_tables:
            edu_cols = {col["name"]: col for col in inspector.get_columns("profile_education")}

            if "from_year" in edu_cols and "from_date" not in edu_cols:
                logger.info("Renaming column from_year to from_date in profile_education")
                conn.execute(text("ALTER TABLE profile_education RENAME COLUMN from_year TO from_date"))
                edu_cols["from_date"] = edu_cols.pop("from_year")

            if "to_year" in edu_cols and "to_date" not in edu_cols:
                logger.info("Renaming column to_year to to_date in profile_education")
                conn.execute(text("ALTER TABLE profile_education RENAME COLUMN to_year TO to_date"))
                edu_cols["to_date"] = edu_cols.pop("to_year")

            if "from_date" not in edu_cols:
                logger.info("Adding column from_date to profile_education")
                conn.execute(text("ALTER TABLE profile_education ADD COLUMN from_date VARCHAR"))

            if "to_date" not in edu_cols:
                logger.info("Adding column to_date to profile_education")
                conn.execute(text("ALTER TABLE profile_education ADD COLUMN to_date VARCHAR"))

        # 4. Migrate candidate_profiles columns
        if "candidate_profiles" in existing_tables:
            cp_cols = {col["name"]: col for col in inspector.get_columns("candidate_profiles")}
            if "org_id" in cp_cols:
                if is_postgres:
                    logger.info("Dropping org_id column from candidate_profiles")
                    conn.execute(text("ALTER TABLE candidate_profiles DROP COLUMN IF EXISTS org_id CASCADE"))

        # 5. Drop deprecated tables if present
        if is_postgres:
            if "organizations" in existing_tables:
                logger.info("Dropping table organizations")
                conn.execute(text("DROP TABLE IF EXISTS organizations CASCADE"))
            if "api_keys" in existing_tables:
                logger.info("Dropping table api_keys")
                conn.execute(text("DROP TABLE IF EXISTS api_keys CASCADE"))

        logger.info("Database migration completed successfully.")
