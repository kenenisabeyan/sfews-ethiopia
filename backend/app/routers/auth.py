from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas
from ..security import verify_password, get_password_hash, create_access_token, get_current_user

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

@router.post("/login", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

# Utility to seed the initial admin user
@router.post("/seed-admin")
def seed_admin(db: Session = Depends(get_db)):
    # Check if any user exists
    user = db.query(models.User).first()
    if user:
        return {"msg": "Admin already exists"}
        
    hashed_password = get_password_hash("admin123")
    new_user = models.User(
        name="System Administrator",
        email="admin@sfews.gov.et",
        hashed_password=hashed_password,
        role="admin"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"msg": "Initial admin user created", "email": "admin@sfews.gov.et", "password": "admin123"}
