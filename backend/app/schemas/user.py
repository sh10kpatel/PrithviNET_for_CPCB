from pydantic import BaseModel, EmailStr


class UserLogin(BaseModel):
    email: str
    password: str


class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "Citizen"
    region: str | None = None
    station_id: str | None = None


class UserResponse(BaseModel):
    user_id: int
    name: str
    email: str
    role: str
    region: str | None = None
    station_id: str | None = None
    is_active: bool

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
