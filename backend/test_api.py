import os
import sys
import requests

BASE_URL = "http://localhost:8000"
DEFAULT_API_KEY = "ats_live_default_key_1234567890"

def test_api():
    print("Testing Smart Autofill Backend API & Security...")
    
    # 1. Health check
    res = requests.get(f"{BASE_URL}/")
    assert res.status_code == 200, f"Root endpoint failed: {res.text}"
    print("[OK] Backend API online")

    # 2. Test Partial Save Rule on /profiles
    # Create profile with ONLY 2 fields (given_names + email_address)
    create_payload = {
        "candidate_display_name": "Partial Candidate",
        "details": {
            "given_names": "Alice",
            "email_address": "alice@example.com"
        }
    }
    res = requests.post(f"{BASE_URL}/profiles", json=create_payload)
    assert res.status_code == 200, f"Create profile failed: {res.text}"
    profile = res.json()
    profile_id = profile["id"]
    profile_slug = profile["profile_slug"]
    print(f"[OK] Profile created: {profile_slug} ({profile_id})")

    # Verify DB details has given_names and email_address set, family_name and phone_number are null
    dt = profile["details"]
    assert dt["given_names"] == "Alice"
    assert dt["email_address"] == "alice@example.com"
    assert dt["family_name"] is None
    assert dt["phone_number"] is None
    print("[OK] Partial save rule verified (saved with null fields without error)")

    # 3. Test Extension API Bearer Authentication Enforcement
    # 3a. Without auth header -> MUST return 401
    res_no_auth = requests.get(f"{BASE_URL}/extension/profiles")
    assert res_no_auth.status_code == 401, f"Expected 401 without auth, got: {res_no_auth.status_code}"
    print("[OK] Bearer Auth check passed: missing key returned 401")

    # 3b. With invalid auth header -> MUST return 401
    res_bad_auth = requests.get(f"{BASE_URL}/extension/profiles", headers={"Authorization": "Bearer invalid_api_key_xyz"})
    assert res_bad_auth.status_code == 401, f"Expected 401 with bad key, got: {res_bad_auth.status_code}"
    print("[OK] Bearer Auth check passed: invalid key returned 401")

    # 3c. With valid Bearer header -> MUST return 200
    ext_headers = {"Authorization": f"Bearer {DEFAULT_API_KEY}"}
    res_valid_auth = requests.get(f"{BASE_URL}/extension/profiles", headers=ext_headers)
    assert res_valid_auth.status_code == 200, f"Expected 200 with valid key, got: {res_valid_auth.text}"
    ext_profiles = res_valid_auth.json()
    assert len(ext_profiles) > 0
    print(f"[OK] Bearer Auth check passed: valid key retrieved {len(ext_profiles)} profiles")

    # 4. Test Extension API - GET /extension/profiles/{id}
    res_full = requests.get(f"{BASE_URL}/extension/profiles/{profile_id}", headers=ext_headers)
    assert res_full.status_code == 200
    assert res_full.json()["details"]["given_names"] == "Alice"
    print("[OK] Extension full profile payload retrieved")

    # 5. Test Case B: POST /extension/profiles/{id}/learned-fields (Upsert)
    lf_payload = {
        "ats_domain": "mock-ats.test",
        "field_label_text": "What is your preferred IDE?",
        "field_value": "VS Code"
    }
    res_lf = requests.post(f"{BASE_URL}/extension/profiles/{profile_id}/learned-fields", json=lf_payload, headers=ext_headers)
    assert res_lf.status_code == 200, f"Push learned field failed: {res_lf.text}"
    print("[OK] Case B learned field pushed successfully")

    # 6. Test Case A: PATCH /extension/profiles/{id}/field (Single Structured Field Sync)
    patch_payload = {
        "field_key": "details.city",
        "value": "San Francisco"
    }
    res_patch = requests.patch(f"{BASE_URL}/extension/profiles/{profile_id}/field", json=patch_payload, headers=ext_headers)
    assert res_patch.status_code == 200, f"Case A single field PATCH failed: {res_patch.text}"
    
    # Verify profile now reflects updated city
    res_verify = requests.get(f"{BASE_URL}/extension/profiles/{profile_id}", headers=ext_headers)
    assert res_verify.status_code == 200
    assert res_verify.json()["details"]["city"] == "San Francisco"
    print("[OK] Case A single field PATCH verified (city updated to San Francisco)")

    print("\nALL BACKEND API & SECURITY VERIFICATION CHECKS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_api()
