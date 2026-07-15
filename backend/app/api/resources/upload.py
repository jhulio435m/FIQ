from fastapi import HTTPException, UploadFile, Request
from sqlmodel.ext.asyncio.session import AsyncSession
from pathlib import Path

from app.core.config import settings
from app.core.s3 import s3_service
from app.models.user import User
from app.logs.crud import log_activity
from app.api.resources.crud import _activity_type

PDF_MIME_TYPES = {"application/pdf", "application/x-pdf"}
PDF_EXTENSION = ".pdf"

def _safe_upload_filename(filename: str | None) -> str:
    if not filename:
        raise HTTPException(status_code=422, detail="El archivo debe incluir nombre")
    basename = Path(filename).name
    if basename != filename or ".." in Path(filename).parts:
        raise HTTPException(status_code=422, detail="Nombre de archivo no permitido")
    suffixes = [suffix.lower() for suffix in Path(basename).suffixes]
    if suffixes != [PDF_EXTENSION]:
        raise HTTPException(status_code=415, detail="Solo se permiten archivos PDF con extensión .pdf")
    return s3_service.sanitize_filename(basename)

def _assert_pdf_upload(file: UploadFile, content: bytes) -> str:
    safe_name = _safe_upload_filename(file.filename)
    if file.content_type not in PDF_MIME_TYPES:
        raise HTTPException(status_code=415, detail="Solo se permiten archivos PDF")
    if not content:
        raise HTTPException(status_code=422, detail="El archivo está vacío")
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail="El archivo excede el tamaño máximo permitido")
    if not content.startswith(b"%PDF"):
        raise HTTPException(status_code=415, detail="El archivo no es un PDF válido")
    if b"%%EOF" not in content[-2048:]:
        raise HTTPException(status_code=422, detail="El archivo PDF está corrupto o incompleto")
    return safe_name

async def _log_upload_rejected(
    db: AsyncSession,
    request: Request,
    user: User,
    reason: str,
    filename: str | None,
) -> None:
    tipo = await _activity_type(db, "upload_rejected")
    if not tipo:
        return
    await log_activity(
        db,
        usuario_id=user.id,
        tipo_actividad_id=tipo.id,
        ip_origen=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        detalle_accion={
            "resultado": "fallido",
            "motivo": reason,
            "archivo": s3_service.sanitize_filename(filename),
        },
    )
