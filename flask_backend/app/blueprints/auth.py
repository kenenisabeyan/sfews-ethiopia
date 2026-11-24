from flask import Blueprint, request, jsonify, g
from ..database import SessionLocal
from ..models import User
from ..security import verify_password, hash_password, create_access_token, token_required

auth_bp = Blueprint("auth", __name__, url_prefix="/api/v1/auth")

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"detail": "Missing email or password credentials"}), 400

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user or not verify_password(password, user.hashed_password):
            return jsonify({"detail": "Invalid email or authentication key"}), 401

        token = create_access_token({"sub": user.email, "role": user.role, "name": user.name})
        return jsonify({
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role
            }
        }), 200
    finally:
        db.close()

@auth_bp.route("/me", methods=["GET"])
@token_required
def get_current_user():
    return jsonify({
        "email": g.current_user.get("sub"),
        "role": g.current_user.get("role", "admin"),
        "name": g.current_user.get("name", "Command Operator")
    }), 200

@auth_bp.route("/users", methods=["GET"])
@token_required
def list_users():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        return jsonify([{
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "created_at": u.created_at.isoformat() if u.created_at else None
        } for u in users]), 200
    finally:
        db.close()

@auth_bp.route("/seed-admin", methods=["POST"])
def seed_admin():
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == "admin@sfews.gov.et").first()
        if not admin:
            admin = User(
                name="Command Operator",
                email="admin@sfews.gov.et",
                hashed_password=hash_password("admin123"),
                role="admin"
            )
            db.add(admin)
            db.commit()
            return jsonify({"status": "CREATED", "email": admin.email}), 200
        return jsonify({"status": "ALREADY_EXISTS", "email": admin.email}), 200
    finally:
        db.close()
