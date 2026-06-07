from fastapi import Depends, HTTPException, status

from app.core.users import current_active_user
from app.models.user import User


def require_role(*roles: str):
    def checker(user: User = Depends(current_active_user)) -> User:
        if not user.is_effectively_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no encontrado o inactivo",
            )
        if user.rol not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para esta acción",
            )
        return user
    return checker
