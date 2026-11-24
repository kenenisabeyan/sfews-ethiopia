import os
import hashlib
import hmac
from datetime import datetime, timezone, timedelta
from functools import wraps
from flask import request, jsonify, g
import jwt

SECRET_KEY = os.getenv("SECRET_KEY", "sfews-super-secure-production-master-secret-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

def hash_password(password: str) -> str:
    """Secure PBKDF2-HMAC-SHA256 password hashing with salt."""
    salt = os.urandom(16).hex()
    pwd_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000).hex()
    return f"{salt}${pwd_hash}"

def verify_password(plain_password: str, stored_hash: str) -> bool:
    """Validates plain password against salt$hash string."""
    try:
        salt, pwd_hash = stored_hash.split("$")
        computed_hash = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), 100000).hex()
        return hmac.compare_digest(pwd_hash, computed_hash)
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except Exception:
        return None

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        token = None
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
        elif "token" in request.args:
            token = request.args.get("token")
        
        if not token:
            return jsonify({"detail": "Authentication token missing"}), 401
        
        payload = decode_access_token(token)
        if not payload:
            return jsonify({"detail": "Invalid or expired authorization token"}), 401
        
        g.current_user = payload
        return f(*args, **kwargs)
    return decorated
