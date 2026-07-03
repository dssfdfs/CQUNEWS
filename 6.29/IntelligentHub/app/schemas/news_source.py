from pydantic import BaseModel
from typing import Optional


class NewsSourceCreate(BaseModel):
    name: str
    url: str
    source_type: str = "website"
    rss_url: Optional[str] = None
    enabled: bool = True


class NewsSourceResponse(BaseModel):
    id: int
    name: str
    url: str
    source_type: str
    rss_url: Optional[str]
    enabled: bool

    class Config:
        orm_mode = True