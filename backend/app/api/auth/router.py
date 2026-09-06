from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
import uuid
import httpx
import urllib.parse
import secrets
import hashlib
import base64
from datetime import datetime, timedelta, timezone
import jwt
from jwt import PyJWTError
from pydantic import BaseModel

from app.core.config import settings
from app.core.database import get_db
from app.core.users import UserManager, get_jwt_strategy, get_user_manager, get_optional_user
from app.api.auth.schemas import LoginRequest, LoginResponse, MicrosoftLoginRequest
from app.models.user import User
from app.core.security import hash_password
from app.core.sessions import (COOKIE, check_browser_origin, check_session_request,
                               issue_refresh, consume_refresh, revoke_sessions, token_hash)
from app.models.session import RefreshSession
from app.core.rate_limit import build_rate_limiter, client_rate_key
from app.models.activity import TipoActividad
from app.logs.crud import log_activity
from app.core.cache import get_activity_type_id

router = APIRouter()
auth_rate_limiter = build_rate_limiter(
    requests=settings.AUTH_RATE_LIMIT_REQUESTS,
    window_seconds=settings.RATE_LIMIT_WINDOW_SECONDS,
)
session_rate_limiter = build_rate_limiter(
    requests=settings.SESSION_RATE_LIMIT_REQUESTS,
    window_seconds=settings.RATE_LIMIT_WINDOW_SECONDS,
)


async def limit_generated_login(request: Request) -> None:
    check_browser_origin(request)
    await auth_rate_limiter.check(client_rate_key(request, "login"))


def _login_response(user: User, access_token: str) -> LoginResponse:
    return LoginResponse(
        access_token=access_token,
        usuario={
            "id": str(user.id),
            "nombre": user.nombre,
            "email": user.email,
            "rol": user.rol,
            "rol_id": user.rol_id,
            "rol_nombre": user.rol,
            "esta_activo": user.esta_activo,
            "is_superuser": user.is_superuser,
        },
    )


@router.post("/login", response_model=LoginResponse)
async def login(
    request: Request,
    response: Response,
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
    user_manager: UserManager = Depends(get_user_manager),
):
    check_browser_origin(request)
    await auth_rate_limiter.check(client_rate_key(request, "login"))
    credentials = OAuth2PasswordRequestForm(
        username=data.email,
        password=data.password,
        scope="",
        grant_type="password",
        client_id=None,
        client_secret=None,
    )
    user = await user_manager.authenticate(credentials)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
        )
    if not user.is_effectively_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta desactivada",
        )
    strategy = get_jwt_strategy()
    access_token = await strategy.write_token(user)

    tipo_id = await get_activity_type_id(db, "login")
    if tipo_id:
        await log_activity(
            db,
            usuario_id=user.id,
            tipo_actividad_id=tipo_id,
            detalle_accion={"email": user.email},
        )

    await issue_refresh(db, user, response)
    return _login_response(user, access_token)


@router.post("/refresh", response_model=LoginResponse)
async def refresh_access_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    await session_rate_limiter.check(client_rate_key(request, "refresh"))
    user = await consume_refresh(db, request)

    strategy = get_jwt_strategy()
    access_token = await strategy.write_token(user)
    await issue_refresh(db, user, response)
    return _login_response(user, access_token)


@router.post("/logout")
async def logout(request: Request, response: Response, db: AsyncSession = Depends(get_db),
                 user: User | None = Depends(get_optional_user)):
    check_session_request(request)
    if user is None:
        session = await db.get(RefreshSession, token_hash(request.cookies.get(COOKIE, "")))
        if session:
            candidate = await db.get(User, session.user_id)
            if (candidate and candidate.auth_version == session.auth_version
                    and session.expires_at.replace(tzinfo=timezone.utc) > datetime.now(timezone.utc)):
                user = candidate
    if user:
        await revoke_sessions(db, user)
    response.delete_cookie(COOKIE, path="/")
    response.delete_cookie("fastapiusersauth", path="/")
    response.headers["Cache-Control"] = "no-store"
    return {"message": "Sesión cerrada correctamente"}


@router.get("/microsoft/authorize-url")
async def get_microsoft_authorize_url(request: Request, response: Response, redirect_uri: str):
    check_browser_origin(request)
    if redirect_uri != settings.FRONTEND_URL.rstrip("/") + "/login":
        raise HTTPException(400, "Redirección no permitida")
    if not settings.MICROSOFT_CLIENT_ID or not settings.MICROSOFT_TENANT_ID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El inicio de sesión por Microsoft no está configurado.",
        )
    verifier = secrets.token_urlsafe(64)
    state = secrets.token_urlsafe(32)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    response.set_cookie("fiq_oauth", jwt.encode({
        "state": state, "verifier": verifier, "redirect_uri": redirect_uri,
        "aud": "fiq:oauth", "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
    }, settings.SECRET_KEY, algorithm=settings.ALGORITHM),
        max_age=300, secure=settings.SESSION_COOKIE_SECURE, httponly=True, samesite="lax", path="/")
    response.headers["Cache-Control"] = "no-store"
    encoded_redirect = urllib.parse.quote(redirect_uri, safe="")
    url = (
        f"https://login.microsoftonline.com/{settings.MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize"
        f"?client_id={settings.MICROSOFT_CLIENT_ID}"
        f"&response_type=code"
        f"&redirect_uri={encoded_redirect}"
        f"&response_mode=query"
        f"&scope=openid%20profile%20email%20User.Read"
        f"&state={state}&code_challenge={challenge}&code_challenge_method=S256"
    )
    return {"url": url}



@router.post("/microsoft", response_model=LoginResponse)
async def microsoft_login(
    request: Request,
    response: Response,
    data: MicrosoftLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    check_browser_origin(request)
    try:
        flow = jwt.decode(request.cookies.get("fiq_oauth", ""), settings.SECRET_KEY,
                          algorithms=[settings.ALGORITHM], audience="fiq:oauth")
        if (not secrets.compare_digest(flow["state"], data.state)
                or data.redirect_uri != flow["redirect_uri"]
                or data.redirect_uri != settings.FRONTEND_URL.rstrip("/") + "/login"):
            raise ValueError("Invalid OAuth flow")
    except (PyJWTError, KeyError, ValueError, TypeError) as exc:
        raise HTTPException(400, "Inicio de sesión Microsoft inválido o expirado") from exc
    response.delete_cookie("fiq_oauth", path="/")
    await auth_rate_limiter.check(client_rate_key(request, "microsoft-login"))
    if not settings.MICROSOFT_CLIENT_ID or not settings.MICROSOFT_TENANT_ID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El inicio de sesión por Microsoft no está configurado.",
        )

    # 1. Exchange authorization code for token
    token_url = f"https://login.microsoftonline.com/{settings.MICROSOFT_TENANT_ID}/oauth2/v2.0/token"
    token_data = {
        "client_id": settings.MICROSOFT_CLIENT_ID,
        "client_secret": settings.MICROSOFT_CLIENT_SECRET,
        "code": data.code,
        "redirect_uri": data.redirect_uri,
        "grant_type": "authorization_code",
        "code_verifier": flow["verifier"],
    }
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        token_resp = await client.post(token_url, data=token_data)
        if token_resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Microsoft no pudo completar la autenticación.",
            )
        token_json = token_resp.json()
        access_token = token_json.get("access_token")
        if not isinstance(access_token, str) or not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Microsoft no devolvió una sesión válida.",
            )
        
        # 2. Get user profile from Graph API
        profile_url = "https://graph.microsoft.com/v1.0/me"
        headers = {"Authorization": f"Bearer {access_token}"}
        profile_resp = await client.get(profile_url, headers=headers)
        if profile_resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se pudo obtener el perfil institucional de Microsoft.",
            )
        profile_json = profile_resp.json()
        
    email = profile_json.get("mail") or profile_json.get("userPrincipalName")
    name = profile_json.get("displayName") or "Usuario UNCP"
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo obtener el correo del perfil de Microsoft.",
        )
        
    email = email.lower().strip()
    
    # 3. Domain validation
    if not email.endswith("@uncp.edu.pe"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Acceso denegado: Solo se permiten correos institucionales @uncp.edu.pe.",
        )

    # 4. Check if user already exists
    user_res = await db.exec(select(User).where(User.email == email))
    user = user_res.first()
    
    if not user:
        # Create new user
        user = User(
            id=uuid.uuid4(),
            email=email,
            hashed_password=hash_password(str(uuid.uuid4())),
            nombre=name,
            rol_id=3, # default to Estudiante
            esta_activo=True,
            is_active=True,
            is_superuser=False,
            is_verified=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        metodo = "microsoft_signup"
    else:
        metodo = "microsoft_login"

    tipo_id = await get_activity_type_id(db, "login")
    if tipo_id:
        await log_activity(
            db,
            usuario_id=user.id,
            tipo_actividad_id=tipo_id,
            detalle_accion={"email": user.email, "metodo": metodo},
        )

    if not user.is_effectively_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta desactivada",
        )

    # 5. Generate strategy JWT token
    strategy = get_jwt_strategy()
    jwt_token = await strategy.write_token(user)
    await issue_refresh(db, user, response)

    return _login_response(user, jwt_token)
