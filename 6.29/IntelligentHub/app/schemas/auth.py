from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str
    captcha: str
    session_key: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    role: str