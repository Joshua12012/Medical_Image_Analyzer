import cloudinary.uploader
import io
import uuid
from fastapi import UploadFile, HTTPException
from ..db_connection import UPLOAD_DIR
from ..models import ImageUploadResponse
from typing import Dict, Any

async def upload_image_to_cloudinary(file: UploadFile) -> ImageUploadResponse:
    """
    Reads the file content, uploads it to Cloudinary, and returns the URL.
    This replaces the local saving logic for uploads that should be permanent/accessible.
    """
    try:
        # Read file bytes once
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file content.")

        # Upload to Cloudinary
        # We use io.BytesIO(content) to treat the bytes as a file-like object for upload
        result = cloudinary.uploader.upload(
            io.BytesIO(content), 
            folder="chat_images", 
            public_id=uuid.uuid4().hex, 
            resource_type="image"
        )
        
        # Cloudinary returns a secure URL
        secure_url = result["secure_url"]
        
        return ImageUploadResponse(url=secure_url, filename=file.filename)
        
    except HTTPException:
        raise # Re-raise explicit exceptions
    except Exception as e:
        print(f"Cloudinary upload failed: {e}")
        # In a real app, you might want to log this
        raise HTTPException(status_code=500, detail=f"Image upload service failed: {str(e)}")


def get_local_upload_path(filename: str) -> str:
    """Returns the full path for a local file download."""
    path = UPLOAD_DIR / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return str(path)