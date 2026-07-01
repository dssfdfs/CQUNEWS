from pydantic import BaseModel


class EntityResponse(BaseModel):
    id: int
    name: str
    entity_type: str

    class Config:
        orm_mode = True