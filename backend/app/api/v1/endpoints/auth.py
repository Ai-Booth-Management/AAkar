"""Authentication endpoints: register, login, and current-user retrieval."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from pathlib import Path
import pandas as pd
import re

from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_current_user,
    hash_password,
    verify_password,
    oauth2_scheme,
)
from app.core.config import settings
from jose import jwt, JWTError
from app.domain.models.auth import RevokedToken
from app.domain.models.user import User
from app.infrastructure.db.sqlite_client import get_session

router = APIRouter()


# ── Request / Response schemas ─────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str
    password: str
    role: str = "official"
    display_name: str | None = None
    state_id: str | None = None
    district_id: str | None = None
    constituency_id: str | None = None
    mandal_id: str | None = None
    booth_id: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict

class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    display_name: str | None
    state_id: str | None = None
    district_id: str | None = None
    constituency_id: str | None = None
    mandal_id: str | None = None
    booth_id: str | None = None


# ── Endpoints ──────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, session: Session = Depends(get_session)):
    """Create a new user account and return a JWT."""
    if body.role == "booth":
        match = re.match(r'^booth_(.*)@', body.email)
        if match:
            booth_id = match.group(1).strip()
            voters_csv = Path("data/uploads/voters.csv")
            valid_booths = set()
            if voters_csv.exists():
                try:
                    df = pd.read_csv(voters_csv, dtype=str)
                    col = "booth_id" if "booth_id" in df.columns else "Booth_id"
                    if col in df.columns:
                        valid_booths = set(df[col].dropna().str.strip().unique())
                except Exception:
                    pass
            
            if booth_id not in valid_booths:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid Booth ID: Not found in voters registry."
                )

    db_email = body.email.lower()
    existing = session.exec(select(User).where(User.email == db_email)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="email-already-in-use",
        )

    user = User(
        email=db_email,
        hashed_password=hash_password(body.password),
        role=body.role.upper(),
        display_name=body.display_name,
        state_id=body.state_id,
        district_id=body.district_id,
        constituency_id=body.constituency_id,
        mandal_id=body.mandal_id,
        booth_id=body.booth_id,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    access_token = create_access_token({"sub": user.email})
    refresh_token = create_refresh_token({"sub": user.email})
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user={
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "displayName": user.display_name,
            "state_id": user.state_id,
            "district_id": user.district_id,
            "constituency_id": user.constituency_id,
            "mandal_id": user.mandal_id,
            "booth_id": user.booth_id,
        },
    )


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, session: Session = Depends(get_session)):
    """Authenticate and return a JWT."""
    db_email = body.email.lower()
    user = session.exec(select(User).where(User.email == db_email)).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid-credentials",
        )

    access_token = create_access_token({"sub": user.email})
    refresh_token = create_refresh_token({"sub": user.email})
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user={
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "displayName": user.display_name,
            "state_id": user.state_id,
            "district_id": user.district_id,
            "constituency_id": user.constituency_id,
            "mandal_id": user.mandal_id,
            "booth_id": user.booth_id,
        },
    )


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user."""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role,
        display_name=current_user.display_name,
        state_id=current_user.state_id,
        district_id=current_user.district_id,
        constituency_id=current_user.constituency_id,
        mandal_id=current_user.mandal_id,
        booth_id=current_user.booth_id,
    )


@router.post("/refresh")
def refresh_token(body: RefreshRequest, session: Session = Depends(get_session)):
    """Generate a new access token from a valid refresh token."""
    try:
        payload = jwt.decode(body.refresh_token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        email = payload.get("sub")
        token_type = payload.get("type")
        jti = payload.get("jti")
        if email is None or token_type != "refresh" or jti is None:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
            
        is_revoked = session.exec(select(RevokedToken).where(RevokedToken.jti == jti)).first()
        if is_revoked:
            raise HTTPException(status_code=401, detail="Refresh token revoked")
            
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
        
    user = session.exec(select(User).where(User.email == email)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    access_token = create_access_token({"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout")
def logout(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    """Revoke the current access token."""
    if not token:
        return {"status": "success", "message": "Logged out successfully (no token)"}
        
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        jti = payload.get("jti")
        if jti:
            revoked = RevokedToken(jti=jti)
            session.add(revoked)
            session.commit()
    except JWTError:
        pass # If token is invalid, we don't care during logout
        
    return {"status": "success", "message": "Logged out successfully"}
