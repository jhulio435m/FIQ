from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: dict


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class MicrosoftLoginRequest(BaseModel):
    code: str
    redirect_uri: str
