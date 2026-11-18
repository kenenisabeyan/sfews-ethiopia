from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas
from ..security import verify_password, get_password_hash, create_access_token, get_current_user

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication & Access Control"])

@router.post("/login", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Standard OAuth2 password bearer token authentication.
    """
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    return schemas.Token(access_token=access_token, token_type="bearer", expires_in=86400)

@router.post("/token", response_model=schemas.Token)
def login_with_json(login_data: dict, db: Session = Depends(get_db)):
    """
    JSON-based authentication endpoint for direct REST and mobile clients.
    """
    email = login_data.get("email") or login_data.get("username")
    password = login_data.get("password")
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    return schemas.Token(access_token=access_token, token_type="bearer", expires_in=86400)

@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Register a new situational analyst or operator user.
    """
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A user with this email already exists")

    hashed_pw = get_password_hash(payload.password)
    new_user = models.User(
        name=payload.name,
        email=payload.email,
        hashed_password=hashed_pw,
        role=payload.role or "analyst"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.get("/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    """
    Return identity details of current authenticated JWT subject.
    """
    return current_user

@router.get("/users", response_model=List[schemas.UserResponse])
def list_system_users(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    List all authorized operators and analysts.
    """
    return db.query(models.User).all()

@router.post("/seed-admin")
def seed_admin(db: Session = Depends(get_db)):
    """
    Utility endpoint to seed or reset the default command center admin user.
    """
    user = db.query(models.User).filter(models.User.email == "admin@sfews.gov.et").first()
    if user:
        return {"msg": "Admin already exists", "email": "admin@sfews.gov.et"}
        
    hashed_password = get_password_hash("admin123")
    new_user = models.User(
        name="System Administrator",
        email="admin@sfews.gov.et",
        hashed_password=hashed_password,
        role="admin"
    )
    db.add(new_user)
    db.commit()
    return {"msg": "Initial admin user created", "email": "admin@sfews.gov.et", "password": "admin123"}
