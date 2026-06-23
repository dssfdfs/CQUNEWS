from pydantic import BaseModel


class EventResponse(BaseModel):
    id: int
    name: str
    description: str

    class Config:
        orm_mode = True