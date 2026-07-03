from pydantic import BaseModel


class KeywordResponse(BaseModel):
    id: int
    word: str
    frequency: int

    class Config:
        orm_mode = True