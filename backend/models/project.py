from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from models.base import Base

class Project(Base):
    __tablename__ = 'projects'

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255))

    daily_logs = relationship("DailyLog", back_populates="project", cascade="all, delete-orphan")
    daily_log_changes = relationship("DailyLogChange", back_populates="project", cascade="all, delete-orphan")

    def as_dict(self):
        return {col.name: getattr(self, col.name) for col in self.__table__.columns}