import os
import json
import hashlib
import logging
from typing import Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ATSFieldMapping
from app.schemas import (
    AIMatchFieldsRequest, AIMatchFieldsResponse, AIMatchResult
)

logger = logging.getLogger("smart_autofill.ai")
router = APIRouter(prefix="/ai", tags=["AI Field Matching"])

def compute_field_signature(field) -> str:
    sig_raw = f"{field.name_attr or ''}|{field.id_attr or ''}|{(field.label_text or '').strip().lower()}|{field.input_type or ''}"
    return hashlib.sha256(sig_raw.encode('utf-8')).hexdigest()

@router.post("/match-fields", response_model=AIMatchFieldsResponse)
def match_fields_with_ai(
    payload: AIMatchFieldsRequest,
    db: Session = Depends(get_db)
):
    matches: Dict[str, AIMatchResult] = {}
    unresolved_fields = []

    # 1. Tier 0 Cache Check
    for f in payload.fields:
        sig_hash = compute_field_signature(f)
        cached = db.query(ATSFieldMapping).filter(
            ATSFieldMapping.field_signature_hash == sig_hash,
            (ATSFieldMapping.ats_domain == payload.ats_domain) | (ATSFieldMapping.ats_domain == None)
        ).first()

        if cached and cached.confidence >= 0.6:
            matches[f.field_id] = AIMatchResult(
                profile_key=cached.resolved_profile_key,
                confidence=cached.confidence
            )
            # Increment verified count for cache hit
            cached.verified_count += 1
            db.commit()
        else:
            unresolved_fields.append((f, sig_hash))

    if not unresolved_fields:
        return AIMatchFieldsResponse(matches=matches)

    # 2. Tier 2 AI Matcher via Anthropic API (if key available)
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        logger.info("ANTHROPIC_API_KEY not set. Returning cached + empty for heuristic fallback.")
        for f, _ in unresolved_fields:
            matches[f.field_id] = AIMatchResult(profile_key=None, confidence=0.0)
        return AIMatchFieldsResponse(matches=matches)

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        prompt_fields = [
            {
                "field_id": f.field_id,
                "label": f.label_text,
                "name": f.name_attr,
                "id": f.id_attr,
                "placeholder": f.placeholder,
                "type": f.input_type,
                "nearby_text": f.nearby_text
            }
            for f, _ in unresolved_fields
        ]

        prompt_keys = [
            {"key": k.key, "description": k.description}
            for k in payload.available_profile_keys
        ]

        system_prompt = (
            "You are a strict ATS job application form field classifier.\n"
            "Given a list of form fields and available candidate profile keys, map each field to EXACTLY ONE key from the available list, or null if there is no strong match.\n"
            "GOVERNING PRINCIPLE: Wrong-but-confident is worse than blank. If uncertain, return null.\n"
            "Return ONLY a JSON object mapping each field_id to {\"profile_key\": string|null, \"confidence\": float (0.0 to 1.0)}."
        )

        user_content = json.dumps({
            "available_profile_keys": prompt_keys,
            "fields_to_match": prompt_fields
        }, indent=2)

        response = client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=1000,
            system=system_prompt,
            messages=[{"role": "user", "content": f"Classify these fields into JSON:\n{user_content}"}]
        )

        raw_text = response.content[0].text
        # Parse JSON from response
        # Find json block if wrapped in ```json ... ```
        if "```json" in raw_text:
            raw_text = raw_text.split("```json")[1].split("```")[0]
        elif "```" in raw_text:
            raw_text = raw_text.split("```")[1].split("```")[0]

        ai_results = json.loads(raw_text.strip())

        for f, sig_hash in unresolved_fields:
            res = ai_results.get(f.field_id, {})
            pkey = res.get("profile_key")
            conf = float(res.get("confidence", 0.0))

            matches[f.field_id] = AIMatchResult(profile_key=pkey, confidence=conf)

            # Store in Tier 0 cache if confidence is above threshold
            if conf >= 0.6:
                existing_cache = db.query(ATSFieldMapping).filter(
                    ATSFieldMapping.field_signature_hash == sig_hash
                ).first()
                if existing_cache:
                    existing_cache.resolved_profile_key = pkey
                    existing_cache.confidence = conf
                    existing_cache.source = "ai"
                    existing_cache.verified_count += 1
                else:
                    new_mapping = ATSFieldMapping(
                        ats_domain=payload.ats_domain,
                        field_signature_hash=sig_hash,
                        resolved_profile_key=pkey,
                        confidence=conf,
                        source="ai"
                    )
                    db.add(new_mapping)
                db.commit()

    except Exception as e:
        logger.error(f"AI matching error: {e}")
        for f, _ in unresolved_fields:
            if f.field_id not in matches:
                matches[f.field_id] = AIMatchResult(profile_key=None, confidence=0.0)

    return AIMatchFieldsResponse(matches=matches)
