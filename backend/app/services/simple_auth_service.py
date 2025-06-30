"""
Simple Admin-Controlled Authentication System for TurboFCL

This is a simplified authentication system where Coleman (admin) controls
user registration and access. Designed for 5-10 testers at ISI and a few at DARPA.

Key principles:
1. FSO is the FCL application package originator and owner by default
2. One FCL case per business entity at any given time
3. FSO serves as admin for their company (can create additional users)
4. All users affiliated with single FCL application in progress
"""

import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from uuid import UUID, uuid4

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from ..core.config import get_settings
from ..core.database import get_sync_db_session
from ..core.exceptions import AuthorizationError, SecurityError

settings = get_settings()
security_scheme = HTTPBearer()


class SimpleAuthService:
    """Simple authentication service with admin control."""

    def __init__(self, db: Session):
        self.db = db
        self.settings = settings
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 480  # 8 hours

    def create_access_token(
        self, data: Dict, expires_delta: Optional[timedelta] = None
    ):
        """Create JWT access token."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(
                minutes=self.access_token_expire_minutes
            )

        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(
            to_encode, self.settings.SECRET_KEY, algorithm=self.algorithm
        )
        return encoded_jwt

    def verify_token(self, token: str) -> Dict:
        """Verify and decode JWT token."""
        try:
            payload = jwt.decode(
                token, self.settings.SECRET_KEY, algorithms=[self.algorithm]
            )
            email: str = payload.get("sub")
            if email is None:
                raise SecurityError(
                    "Invalid token: no email", security_event="TOKEN_NO_EMAIL"
                )
            return payload
        except JWTError:
            raise SecurityError("Invalid token", security_event="TOKEN_INVALID")

    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt."""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
        return hashed.decode("utf-8")

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash."""
        return bcrypt.checkpw(
            plain_password.encode("utf-8"), hashed_password.encode("utf-8")
        )

    def generate_registration_token(self, admin_email: str = "coleman@isi.edu") -> str:
        """Generate a registration token for new user signup."""
        data = {
            "type": "registration",
            "issued_by": admin_email,
            "issued_at": datetime.utcnow().isoformat(),
            "expires_at": (datetime.utcnow() + timedelta(days=7)).isoformat(),
            "token_id": str(uuid4()),
        }
        return self.create_access_token(data, timedelta(days=7))

    def validate_registration_token(self, token: str) -> bool:
        """Validate a registration token."""
        try:
            payload = self.verify_token(token)
            return payload.get("type") == "registration"
        except:
            return False


# In-memory user store for simplicity (in production, use database)
class UserStore:
    """Simple in-memory user store for development."""

    def __init__(self):
        self.users: Dict[str, Dict] = {}
        self.pending_requests: Dict[str, Dict] = {}

        # Add Coleman as admin
        admin_password = "TurboFCL2025!"  # Change this!
        auth_service = SimpleAuthService(None)
        self.users["coleman@isi.edu"] = {
            "id": str(uuid4()),
            "email": "coleman@isi.edu",
            "password_hash": auth_service.hash_password(admin_password),
            "role": "ADMIN",
            "company_name": "ISI",
            "is_fso": True,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "fcl_application_id": None,
            "permissions": ["CREATE_USERS", "APPROVE_REQUESTS", "MANAGE_FCL"],
        }

    def create_account_request(self, request_data: Dict) -> str:
        """Create an account request for admin approval."""
        request_id = str(uuid4())
        self.pending_requests[request_id] = {
            **request_data,
            "id": request_id,
            "status": "PENDING",
            "created_at": datetime.utcnow(),
        }
        return request_id

    def get_pending_requests(self) -> List[Dict]:
        """Get all pending account requests."""
        return list(self.pending_requests.values())

    def approve_request(self, request_id: str, admin_email: str) -> Dict:
        """Approve an account request and create user."""
        if request_id not in self.pending_requests:
            raise ValueError("Request not found")

        request_data = self.pending_requests[request_id]
        auth_service = SimpleAuthService(None)

        # Generate temporary password
        temp_password = secrets.token_urlsafe(12)

        user_data = {
            "id": str(uuid4()),
            "email": request_data["email"],
            "password_hash": auth_service.hash_password(temp_password),
            "role": "FSO",  # Default role
            "company_name": request_data["company_name"],
            "fso_name": request_data["fso_name"],
            "uei": request_data.get("uei"),
            "is_fso": True,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "approved_by": admin_email,
            "fcl_application_id": None,  # Will be created when they start application
            "permissions": ["CREATE_FCL_APPLICATION", "MANAGE_COMPANY_USERS"],
        }

        self.users[request_data["email"]] = user_data
        del self.pending_requests[request_id]

        return {**user_data, "temporary_password": temp_password}

    def get_user_by_email(self, email: str) -> Optional[Dict]:
        """Get user by email."""
        return self.users.get(email)

    def create_company_user(self, user_data: Dict, creator_email: str) -> Dict:
        """Create a new user within a company (by FSO)."""
        creator = self.get_user_by_email(creator_email)
        if not creator or not creator.get("is_fso"):
            raise AuthorizationError(
                "Only FSOs can create company users",
                required_permission="CREATE_COMPANY_USERS",
            )

        auth_service = SimpleAuthService(None)
        temp_password = secrets.token_urlsafe(12)

        new_user = {
            "id": str(uuid4()),
            "email": user_data["email"],
            "password_hash": auth_service.hash_password(temp_password),
            "role": user_data.get("role", "KMP"),
            "company_name": creator["company_name"],
            "name": user_data["name"],
            "is_fso": False,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "created_by": creator_email,
            "fcl_application_id": creator.get("fcl_application_id"),
            "permissions": ["CONTRIBUTE_TO_FCL"],
        }

        self.users[user_data["email"]] = new_user
        return {**new_user, "temporary_password": temp_password}


# Global user store instance
user_store = UserStore()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_sync_db_session),
) -> Dict:
    """Get current authenticated user."""
    auth_service = SimpleAuthService(db)

    try:
        payload = auth_service.verify_token(credentials.credentials)
        email = payload.get("sub")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: no email",
            )

        user = user_store.get_user_by_email(email)

        if not user or not user.get("is_active"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
            )

        return user
    except SecurityError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )


def require_admin(current_user: Dict = Depends(get_current_user)) -> Dict:
    """Require admin role."""
    if current_user.get("role") != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
        )
    return current_user


def require_fso(current_user: Dict = Depends(get_current_user)) -> Dict:
    """Require FSO role."""
    if not current_user.get("is_fso"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="FSO access required"
        )
    return current_user


def get_auth_service(db: Session = Depends(get_sync_db_session)) -> SimpleAuthService:
    """Get auth service instance."""
    return SimpleAuthService(db)
