from fastapi import APIRouter, File, UploadFile
from fastapi.responses import FileResponse
from fastapi import HTTPException

from src.services import file_service
from ..models import ImageUploadResponse

router = APIRouter(tags=["files"])


@router.post("/upload-image/", response_model=ImageUploadResponse)
async def upload_image(file: UploadFile = File(...)):
    """Uploads an image file to a cloud storage service (Cloudinary)."""
    # Logic delegated to the file service
    return await file_service.upload_image_to_cloudinary(file)


@router.get("/uploads/{filename}")
def get_uploaded_image(filename: str):
    """Serves locally saved files (original logic for static file retrieval)."""
    # Logic delegated to the file service
    path = file_service.get_local_upload_path(filename)
    return FileResponse(path)