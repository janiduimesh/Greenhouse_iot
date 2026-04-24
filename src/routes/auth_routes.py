from fastapi import APIRouter, HTTPException, Depends, status
from datetime import datetime, timezone
import logging

from schema.user import UserRegister, UserLogin, UserResponse, TokenResponse
from utils.database import get_database
from utils.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    require_role,
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/auth/register", response_model=UserResponse)
async def register(
    data: UserRegister,
    current_user: dict = None,
):
    """
    Register a new user.
    - First user ever: auto-becomes admin, no auth required.
    - After that: only admins can register new users.
    """
    db = get_database()
    users = db["users"]

    user_count = await users.count_documents({})

    # First user → auto admin, no auth needed
    if user_count == 0:
        data.role = "admin"
    else:
        # Must be authenticated admin
        if current_user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required. Only admins can register new users.",
            )
        if current_user["role"] != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can register new users.",
            )

    # Check email uniqueness
    existing = await users.find_one({"email": data.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered.",
        )

    now = datetime.now(timezone.utc)
    user_doc = {
        "name": data.name,
        "email": data.email,
        "password": hash_password(data.password),
        "role": data.role,
        "created_at": now,
        "updated_at": now,
    }

    result = await users.insert_one(user_doc)
    logger.info("Registered user: %s (%s) as %s", data.name, data.email, data.role)

    return UserResponse(
        id=str(result.inserted_id),
        name=data.name,
        email=data.email,
        role=data.role,
        created_at=now,
    )


# Overload: allow register with or without auth token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

optional_security = HTTPBearer(auto_error=False)


@router.post("/auth/register", response_model=UserResponse, include_in_schema=False)
async def _register_alias():
    """Hidden duplicate — actual route uses the overridden one below."""
    pass


# We need to override the register route to handle optional auth
router.routes.clear()


@router.post("/auth/register", response_model=UserResponse)
async def register_user(
    data: UserRegister,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_security),
):
    """
    Register a new user.
    - First user: auto-becomes admin, no auth needed.
    - After that: requires admin JWT.
    """
    db = get_database()
    users = db["users"]

    user_count = await users.count_documents({})

    current_user = None
    if credentials:
        try:
            from utils.auth import decode_token
            from bson import ObjectId

            payload = decode_token(credentials.credentials)
            uid = payload.get("sub")
            if uid:
                user_doc = await users.find_one({"_id": ObjectId(uid)})
                if user_doc:
                    current_user = {
                        "id": str(user_doc["_id"]),
                        "role": user_doc["role"],
                    }
        except Exception:
            pass

    if user_count == 0:
        data.role = "admin"
    else:
        if current_user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required. Only admins can register new users.",
            )
        if current_user["role"] != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can register new users.",
            )

    existing = await users.find_one({"email": data.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered.",
        )

    now = datetime.now(timezone.utc)
    user_doc = {
        "name": data.name,
        "email": data.email,
        "password": hash_password(data.password),
        "role": data.role,
        "created_at": now,
        "updated_at": now,
    }

    result = await users.insert_one(user_doc)
    logger.info("Registered user: %s (%s) as %s", data.name, data.email, data.role)

    return UserResponse(
        id=str(result.inserted_id),
        name=data.name,
        email=data.email,
        role=data.role,
        created_at=now,
    )


@router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    """Authenticate and return JWT token."""
    db = get_database()
    users = db["users"]

    user = await users.find_one({"email": data.email})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = create_access_token(data={"sub": str(user["_id"]), "role": user["role"]})

    logger.info("User logged in: %s (%s)", user["name"], user["email"])

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=str(user["_id"]),
            name=user["name"],
            email=user["email"],
            role=user["role"],
            created_at=user["created_at"],
        ),
    )


@router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get the currently authenticated user profile."""
    return UserResponse(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["email"],
        role=current_user["role"],
        created_at=current_user["created_at"],
    )


@router.get("/auth/users", response_model=list[UserResponse])
async def list_users(current_user: dict = Depends(require_role("admin"))):
    """List all users (admin only)."""
    db = get_database()
    cursor = db["users"].find({}, {"password": 0})
    users = await cursor.to_list(length=100)

    return [
        UserResponse(
            id=str(u["_id"]),
            name=u["name"],
            email=u["email"],
            role=u["role"],
            created_at=u["created_at"],
        )
        for u in users
    ]
