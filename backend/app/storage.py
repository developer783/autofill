import os
import shutil
from typing import Tuple, Optional

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class StorageService:
    def __init__(self):
        self.provider_type = os.environ.get("STORAGE_PROVIDER", "local").lower()
        self.bucket = os.environ.get("STORAGE_BUCKET")
        self.access_key = os.environ.get("STORAGE_ACCESS_KEY")
        self.secret_key = os.environ.get("STORAGE_SECRET_KEY")
        self.endpoint = os.environ.get("STORAGE_ENDPOINT")

        self.s3_client = None
        if self.provider_type == "s3" and self.access_key and self.secret_key:
            try:
                import boto3
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=self.access_key,
                    aws_secret_access_key=self.secret_key,
                    endpoint_url=self.endpoint
                )
            except Exception as e:
                print(f"[StorageService] Warning: Failed to initialize boto3 S3 client: {e}. Falling back to local storage.")
                self.provider_type = "local"

    def save_file(self, file_obj, filename: str, content_type: Optional[str] = None) -> Tuple[str, str]:
        """
        Saves a file and returns (storage_path_or_key, download_or_public_url)
        """
        if self.provider_type == "s3" and self.s3_client and self.bucket:
            try:
                extra_args = {}
                if content_type:
                    extra_args['ContentType'] = content_type
                
                self.s3_client.upload_fileobj(
                    file_obj,
                    self.bucket,
                    filename,
                    ExtraArgs=extra_args
                )
                url = f"{self.endpoint}/{self.bucket}/{filename}" if self.endpoint else f"https://{self.bucket}.s3.amazonaws.com/{filename}"
                return filename, url
            except Exception as e:
                print(f"[StorageService] S3 upload failed ({e}), falling back to local storage.")

        # Local storage fallback
        dest_path = os.path.join(UPLOAD_DIR, filename)
        file_obj.seek(0) if hasattr(file_obj, 'seek') else None
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file_obj, buffer)
        return dest_path, dest_path

    def get_file_path(self, storage_path_or_key: str) -> Optional[str]:
        if os.path.exists(storage_path_or_key):
            return storage_path_or_key
        local_path = os.path.join(UPLOAD_DIR, storage_path_or_key)
        if os.path.exists(local_path):
            return local_path
        return None

storage_service = StorageService()
