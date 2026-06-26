"""JWT-based authentication and password hashing utilities."""

from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import uuid
import bcrypt
from sqlmodel import Session, select

from app.core.config import settings
from app.domain.models.user import User
from app.domain.models.auth import RevokedToken
from app.infrastructure.db.sqlite_client import get_session

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def hash_password(plain: str) -> str:
    """Hash a plain-text password with bcrypt."""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=15) # 15 min access token
    )
    to_encode.update({"exp": expire, "jti": str(uuid.uuid4()), "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def create_refresh_token(data: dict) -> str:
    """Create a signed JWT refresh token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7) # 7 days
    to_encode.update({"exp": expire, "jti": str(uuid.uuid4()), "type": "refresh"})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> User:
    """Decode the JWT and return the corresponding User from SQLite."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if token is None:
        raise credentials_exception
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        email: str | None = payload.get("sub")
        token_type = payload.get("type", "access")
        jti = payload.get("jti")
        
        if email is None or token_type != "access" or jti is None:
            raise credentials_exception
            
        # Check if revoked
        is_revoked = session.exec(select(RevokedToken).where(RevokedToken.jti == jti)).first()
        if is_revoked:
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception

    user = session.exec(select(User).where(User.email == email)).first()
    if user is None:
        raise credentials_exception
    
    # Normalize roles for authorization compatibility
    if user.role:
        if user.role.lower() in ["official", "cm", "dm"]:
            user.role = user.role.lower()
        else:
            user.role = user.role.upper()
        
    return user

def role_required(*allowed_roles: str):
    """Dependency to check if the current user has one of the allowed roles."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return role_checker
