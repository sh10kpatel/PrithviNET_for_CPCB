"""
Authentication endpoints – login, register, and get-current-user.
"""

from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.models.user import User
from app.schemas.user import UserLogin, UserCreate, UserResponse, TokenResponse

router = APIRouter()


# ---------------------------------------------------------------------------
#  Helper: extract current user from Authorization header
# ---------------------------------------------------------------------------

def get_current_user(
    authorization: str = Header(..., description="Bearer <token>"),
    db: Session = Depends(get_db),
) -> User:
    """Decode JWT from the Authorization header and return the User row."""

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header format")

    token = authorization.removeprefix("Bearer ").strip()
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id: int | None = payload.get("user_id")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Token payload missing user_id")

    user = db.query(User).filter(User.user_id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is deactivated")

    return user


# ---------------------------------------------------------------------------
#  POST /login
# ---------------------------------------------------------------------------

@router.post("/login", response_model=TokenResponse)
def login(body: UserLogin, db: Session = Depends(get_db)):
    """Authenticate with email + password and receive a JWT."""

    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is deactivated")

    token = create_access_token(
        data={
            "user_id": user.user_id,
            "email": user.email,
            "role": user.role,
        }
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            user_id=user.user_id,
            name=user.name,
            email=user.email,
            role=user.role,
            region=user.region,
            station_id=user.station_id,
            is_active=user.is_active,
        ),
    )


# ---------------------------------------------------------------------------
#  GET /me
# ---------------------------------------------------------------------------

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""

    return UserResponse(
        user_id=current_user.user_id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        region=current_user.region,
        station_id=current_user.station_id,
        is_active=current_user.is_active,
    )


# ---------------------------------------------------------------------------
#  POST /register
# ---------------------------------------------------------------------------

@router.post("/register", response_model=UserResponse, status_code=201)
def register(body: UserCreate, db: Session = Depends(get_db)):
    """
    Create a new user account.

    In production this should be restricted to SuperAdmin.
    Role check is intentionally skipped for now (bootstrapping).
    """

    # Check for duplicate email
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
        role=body.role,
        region=body.region,
        station_id=body.station_id,
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return UserResponse(
        user_id=user.user_id,
        name=user.name,
        email=user.email,
        role=user.role,
        region=user.region,
        station_id=user.station_id,
        is_active=user.is_active,
    )
