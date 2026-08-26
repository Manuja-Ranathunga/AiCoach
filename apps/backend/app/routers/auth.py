from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.crud.users import create_user, get_user_by_email
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import LoginRequest, SignupRequest, TokenResponse
from app.schemas.user import UserOut
from app.security import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)) -> TokenResponse:
    if get_user_by_email(db, payload.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = create_user(db, payload.email, payload.password)
    token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    invalid_credentials = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
    )
    user = get_user_by_email(db, payload.email)
    if user is None or not verify_password(payload.password, user.password_hash):
        raise invalid_credentials

    token = create_access_token(subject=str(user.id))
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(current_user)
