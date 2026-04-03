import logging
import uuid
from datetime import datetime, timedelta

import jwt
from itsdangerous import URLSafeTimedSerializer
from passlib.hash import argon2  # Modern hash, no 72-byte limit

from src.config import Config

# Token expiry in seconds
ACCESS_TOKEN_EXPIRY = 3600

# -----------------------------
# Password hashing functions
# -----------------------------

def generate_passwd_hash(password: str) -> str:
    """
    Hash a password using Argon2.
    Works with any password length and is safer than bcrypt.
    """
    if not password:
        raise ValueError("Password cannot be empty")
    return argon2.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    """
    Verify a password against its hash.
    """
    try:
        return argon2.verify(password, hashed)
    except Exception as e:
        logging.exception("Password verification failed")
        return False

# -----------------------------
# JWT access tokens
# -----------------------------

def create_access_token(
    user_data: dict,
    expiry: timedelta = None,
    refresh: bool = False
) -> str:
    """
    Create a JWT access token.
    """
    payload = {
        "user": user_data,
        "exp": datetime.utcnow() + (expiry or timedelta(seconds=ACCESS_TOKEN_EXPIRY)),
        "jti": str(uuid.uuid4()),
        "refresh": refresh
    }

    token = jwt.encode(
        payload=payload,
        key=Config.JWT_SECRET,
        algorithm=Config.JWT_ALGORITHM
    )

    return token


def decode_token(token: str) -> dict | None:
    try:
        token_data = jwt.decode(
            jwt=token,
            key=Config.JWT_SECRET,
            # algorithms=[Config.JWT_ALGORITHM]
            algorithms=[Config.JWT_ALGORITHM]
        )
        return token_data
    except Exception as e:
        logging.error(f"JWT decode failed: {type(e).__name__}: {e}")
        return None
# -----------------------------
# URLSafe token for email, etc.
# -----------------------------

serializer = URLSafeTimedSerializer(secret_key=Config.JWT_SECRET, salt="email-configuration")

def create_url_safe_token(data: dict) -> str:
    """
    Create a URL-safe token using itsdangerous.
    """
    return serializer.dumps(data)


def decode_url_safe_token(token: str) -> dict | None:
    """
    Decode a URL-safe token.
    """
    try:
        return serializer.loads(token)
    except Exception as e:
        logging.error("URL-safe token decode failed: %s", str(e))
        return None