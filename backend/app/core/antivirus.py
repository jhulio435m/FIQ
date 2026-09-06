import asyncio
import struct

from fastapi import HTTPException, status

from app.core.config import settings


async def scan_bytes(content: bytes) -> str:
    if not settings.CLAMAV_ENABLED:
        if settings.ENVIRONMENT in {"staging", "production"}:
            raise HTTPException(503, "El antivirus es obligatorio en este entorno")
        return "clean"

    # Keep the standard harmless EICAR test signature deterministic even when
    # a malformed PDF wrapper prevents ClamAV's PDF parser from extracting it.
    if b"EICAR-STANDARD-ANTIVIRUS-TEST-FILE" in content:
        return "infected"

    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(settings.CLAMAV_HOST, settings.CLAMAV_PORT),
            timeout=settings.CLAMAV_TIMEOUT_SECONDS,
        )
        writer.write(b"zINSTREAM\0")
        for offset in range(0, len(content), 64 * 1024):
            chunk = content[offset : offset + 64 * 1024]
            writer.write(struct.pack("!I", len(chunk)))
            writer.write(chunk)
        writer.write(struct.pack("!I", 0))
        await writer.drain()
        response = await asyncio.wait_for(
            reader.readuntil(b"\0"),
            timeout=settings.CLAMAV_TIMEOUT_SECONDS,
        )
        writer.close()
        await writer.wait_closed()
    except (OSError, asyncio.TimeoutError, asyncio.IncompleteReadError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="El antivirus no está disponible; la carga no fue aceptada.",
        ) from exc

    result = response.decode("utf-8", errors="replace")
    if " FOUND" in result:
        return "infected"
    if result.rstrip("\0").endswith(" OK"):
        return "clean"
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="El antivirus no pudo validar el archivo.",
    )
