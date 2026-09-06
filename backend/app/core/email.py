import asyncio
import smtplib
from email.message import EmailMessage
from urllib.parse import quote

from app.core.config import settings


def _send_reset_message(recipient: str, token: str) -> None:
    reset_url = f"{settings.FRONTEND_URL.rstrip('/')}/recuperar-contrasena?token={quote(token)}"
    message = EmailMessage()
    message["Subject"] = "Restablece tu contraseña - Biblioteca FIQ"
    message["From"] = settings.SMTP_FROM
    message["To"] = recipient
    message.set_content(
        "Se solicitó restablecer tu contraseña de la Biblioteca FIQ.\n\n"
        f"Abre este enlace: {reset_url}\n\n"
        "Si no hiciste la solicitud, ignora este mensaje."
    )

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
        if settings.SMTP_STARTTLS:
            smtp.starttls()
        if settings.SMTP_USERNAME:
            smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        smtp.send_message(message)


async def send_password_reset_email(recipient: str, token: str) -> None:
    if not settings.SMTP_HOST or not settings.SMTP_FROM:
        raise RuntimeError("SMTP no está configurado")
    await asyncio.to_thread(_send_reset_message, recipient, token)
