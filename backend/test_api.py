import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

client = TestClient(app)

class TestSmartAutofillBackend(unittest.TestCase):

    def setUp(self):
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)

    def test_01_slug_sequence_and_partial_save(self):
        """Mandatory Check: Create profile with only 2 fields, confirm save succeeds with nulls elsewhere."""
        payload = {
            "candidate_display_name": "Alice Smith",
            "details": {
                "given_names": "Alice",
                "city": "Seattle"
            }
        }
        res = client.post("/profiles", json=payload)
        self.assertEqual(res.status_code, 200, f"Create profile failed: {res.text}")
        data = res.json()

        self.assertEqual(data["profile_slug"], "profile1")
        self.assertEqual(data["details"]["given_names"], "Alice")
        self.assertEqual(data["details"]["city"], "Seattle")
        self.assertIsNone(data["details"]["family_name"])
        self.assertIsNone(data["details"]["address_line_1"])

        # Second profile creation must get profile2 without collision
        res2 = client.post("/profiles", json={"candidate_display_name": "Bob Jones"})
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()
        self.assertEqual(data2["profile_slug"], "profile2")

    def test_02_extension_endpoints_unauthenticated(self):
        """Mandatory Check: Extension endpoints require no auth headers."""
        client.post("/profiles", json={"candidate_display_name": "Profile One"})
        client.post("/profiles", json={"candidate_display_name": "Profile Two"})

        res = client.get("/extension/profiles")
        self.assertEqual(res.status_code, 200)
        profiles = res.json()
        self.assertEqual(len(profiles), 2)
        self.assertEqual(profiles[0]["profile_slug"], "profile1")

        p1_id = profiles[0]["id"]
        res_full = client.get(f"/extension/profiles/{p1_id}")
        self.assertEqual(res_full.status_code, 200)

    def test_03_case_a_bidirectional_sync(self):
        """Mandatory Check: PATCH /extension/profiles/{id}/field updates single field for active profile."""
        p1 = client.post("/profiles", json={"candidate_display_name": "Alice"}).json()
        p2 = client.post("/profiles", json={"candidate_display_name": "Bob"}).json()

        patch_payload = {
            "field_key": "details.city",
            "value": "San Francisco"
        }
        res_patch = client.patch(f"/extension/profiles/{p1['id']}/field", json=patch_payload)
        self.assertEqual(res_patch.status_code, 200)
        self.assertEqual(res_patch.json()["value"], "San Francisco")

        # Confirm reload in dashboard shows San Francisco on profile1 only
        res_check = client.get(f"/profiles/{p1['id']}")
        self.assertEqual(res_check.json()["details"]["city"], "San Francisco")

        # Confirm profile2 is untouched
        res_check2 = client.get(f"/profiles/{p2['id']}")
        self.assertIsNone(res_check2.json()["details"]["city"])

    def test_04_case_b_learned_fields(self):
        """Mandatory Check: POST /extension/profiles/{id}/learned-fields adds learned field to profile1 only."""
        p1 = client.post("/profiles", json={"candidate_display_name": "Alice"}).json()
        p2 = client.post("/profiles", json={"candidate_display_name": "Bob"}).json()

        lf_payload = {
            "ats_domain": "workday.com",
            "field_label_text": "Favorite Programming Language",
            "field_value": "Python"
        }
        res_lf = client.post(f"/extension/profiles/{p1['id']}/learned-fields", json=lf_payload)
        self.assertEqual(res_lf.status_code, 200)

        # Confirm profile1 has learned field
        res_p1 = client.get(f"/profiles/{p1['id']}")
        self.assertEqual(len(res_p1.json()["learned_fields"]), 1)
        self.assertEqual(res_p1.json()["learned_fields"][0]["field_value"], "Python")

        # Confirm profile2 does NOT have learned field
        res_p2 = client.get(f"/profiles/{p2['id']}")
        self.assertEqual(len(res_p2.json()["learned_fields"]), 0)

    def test_05_resume_upload_persistence_and_metadata(self):
        """Mandatory Check: Resume upload returns filename and uploaded_at metadata, and persists across GET /profiles/{id} reloads."""
        import io
        p = client.post("/profiles", json={"candidate_display_name": "Test Candidate"}).json()
        pid = p["id"]

        # Upload first resume
        fake_file = io.BytesIO(b"Dummy PDF content for resume")
        res_upload = client.post(
            f"/profiles/{pid}/files",
            data={"file_kind": "resume"},
            files={"file": ("sample_resume.pdf", fake_file, "application/pdf")}
        )
        self.assertEqual(res_upload.status_code, 200, f"Upload failed: {res_upload.text}")
        upload_data = res_upload.json()
        self.assertEqual(upload_data["filename"], "sample_resume.pdf")
        self.assertIn("uploaded_at", upload_data)
        self.assertIsNotNone(upload_data["uploaded_at"])

        # Hard reload check via GET /profiles/{id}
        res_get = client.get(f"/profiles/{pid}")
        self.assertEqual(res_get.status_code, 200)
        profile_data = res_get.json()
        self.assertEqual(len(profile_data["files"]), 1)
        self.assertEqual(profile_data["files"][0]["filename"], "sample_resume.pdf")
        self.assertIn("uploaded_at", profile_data["files"][0])

        # Re-upload updated resume
        fake_file2 = io.BytesIO(b"New updated resume content")
        res_upload2 = client.post(
            f"/profiles/{pid}/files",
            data={"file_kind": "resume"},
            files={"file": ("updated_resume.pdf", fake_file2, "application/pdf")}
        )
        self.assertEqual(res_upload2.status_code, 200)
        upload_data2 = res_upload2.json()
        self.assertEqual(upload_data2["filename"], "updated_resume.pdf")

        # Hard reload check after re-upload
        res_get2 = client.get(f"/profiles/{pid}")
        self.assertEqual(res_get2.status_code, 200)
        profile_data2 = res_get2.json()
        self.assertEqual(len(profile_data2["files"]), 1)
        self.assertEqual(profile_data2["files"][0]["filename"], "updated_resume.pdf")

if __name__ == "__main__":
    unittest.main()
