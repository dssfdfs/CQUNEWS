from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, JSON
from sqlalchemy.sql import func
from app.database import Base


class History(Base):
    __tablename__ = "history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    summary = Column(Text, nullable=False)
    titles = Column(JSON, nullable=False)
    quality = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())