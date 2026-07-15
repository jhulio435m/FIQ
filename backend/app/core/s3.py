import re
import uuid
from pathlib import Path

import aioboto3
from fastapi import UploadFile

from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class S3Service:
    def __init__(self):
        self.session = aioboto3.Session()
        self.config = {
            "service_name": "s3",
            "endpoint_url": settings.S3_ENDPOINT,
            "aws_access_key_id": settings.S3_ACCESS_KEY,
            "aws_secret_access_key": settings.S3_SECRET_KEY,
            "use_ssl": False if "localhost" in settings.S3_ENDPOINT or "minio" in settings.S3_ENDPOINT else True,
        }
        self.bucket_name = settings.S3_BUCKET_NAME

    @staticmethod
    def sanitize_filename(file_name: str | None) -> str:
        original_name = file_name or "resource.pdf"
        basename = Path(original_name).name
        safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", basename).strip("._")
        return safe_name or "resource.pdf"

    async def generate_presigned_post(self, file_name: str, folder: str = "resources", expiration: int = 3600):
        """Generate a presigned POST URL for direct browser upload"""
        key = f"{folder}/{uuid.uuid4()}_{self.sanitize_filename(file_name)}"
        async with self.session.client(**self.config) as s3:
            try:
                response = await s3.generate_presigned_post(
                    Bucket=self.bucket_name,
                    Key=key,
                    ExpiresIn=expiration,
                    Conditions=[
                        ["content-length-range", 0, settings.MAX_UPLOAD_SIZE]
                    ]
                )
                if response and getattr(settings, "S3_PUBLIC_URL", ""):
                    response["url"] = response["url"].replace(settings.S3_ENDPOINT, settings.S3_PUBLIC_URL)
                return response, key
            except Exception as e:
                logger.error("Error generating presigned post", exc_info=e)
                return None, None

    async def get_presigned_url(self, file_path: str, expiration: int = 3600) -> str:
        """Generate a presigned GET URL for secure file download"""
        async with self.session.client(**self.config) as s3:
            try:
                url = await s3.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": self.bucket_name, "Key": file_path},
                    ExpiresIn=expiration,
                )
                if getattr(settings, "S3_PUBLIC_URL", ""):
                    url = url.replace(settings.S3_ENDPOINT, settings.S3_PUBLIC_URL)
                return url
            except Exception as e:
                logger.error("Error generating presigned URL", exc_info=e)
                return ""

    async def upload_file(self, file: UploadFile, folder: str = "resources", safe_filename: str | None = None) -> str:
        """Upload a FastAPI UploadFile to object storage and return its object key."""
        safe_name = safe_filename or self.sanitize_filename(file.filename)
        key = f"{folder}/{uuid.uuid4()}_{safe_name}"
        async with self.session.client(**self.config) as s3:
            try:
                await s3.create_bucket(Bucket=self.bucket_name)
            except Exception:
                pass
            await s3.upload_fileobj(
                file.file,
                self.bucket_name,
                key,
                ExtraArgs={"ContentType": file.content_type or "application/octet-stream"},
            )
        return key

s3_service = S3Service()
