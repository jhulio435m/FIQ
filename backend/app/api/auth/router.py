from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
import uuid
import httpx
import urllib.parse
from pydantic import BaseModel

from app.core.config import settings
from app.core.database import get_db
from app.core.users import UserManager, get_jwt_strategy, get_user_manager
from app.api.auth.schemas import LoginRequest, LoginResponse, ForgotPasswordRequest, MicrosoftLoginRequest
from app.models.user import User
from app.core.security import hash_password
from app.models.activity import TipoActividad
from app.logs.crud import log_activity
from app.core.cache import get_activity_type_id

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
    user_manager: UserManager = Depends(get_user_manager),
):
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

    # TODO: Implement real refresh token flow
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


@router.post("/logout")
async def logout():
    return {"message": "Sesión cerrada correctamente"}


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    return {"message": "Si el email existe, recibirás un enlace de recuperación"}


@router.get("/microsoft/authorize-url")
async def get_microsoft_authorize_url(redirect_uri: str):
    if not settings.MICROSOFT_CLIENT_ID or not settings.MICROSOFT_TENANT_ID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El inicio de sesión por Microsoft no está configurado.",
        )
    encoded_redirect = urllib.parse.quote(redirect_uri)
    url = (
        f"https://login.microsoftonline.com/{settings.MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize"
        f"?client_id={settings.MICROSOFT_CLIENT_ID}"
        f"&response_type=code"
        f"&redirect_uri={encoded_redirect}"
        f"&response_mode=query"
        f"&scope=openid%20profile%20email%20User.Read"
    )
    return {"url": url}



@router.post("/microsoft", response_model=LoginResponse)
async def microsoft_login(
    data: MicrosoftLoginRequest,
    db: AsyncSession = Depends(get_db),
):
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
    }
    
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(token_url, data=token_data)
        if token_resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error al obtener token de Microsoft: {token_resp.text}",
            )
        token_json = token_resp.json()
        access_token = token_json.get("access_token")
        
        # 2. Get user profile from Graph API
        profile_url = "https://graph.microsoft.com/v1.0/me"
        headers = {"Authorization": f"Bearer {access_token}"}
        profile_resp = await client.get(profile_url, headers=headers)
        if profile_resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error al obtener perfil de Microsoft: {profile_resp.text}",
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
    user_res = await db.execute(select(User).where(User.email == email))
    user = user_res.scalar_one_or_none()
    
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

    # TODO: Implement real refresh token flow
    return LoginResponse(
        access_token=jwt_token,
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
