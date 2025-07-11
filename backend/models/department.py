# models/department.py
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from models.base import Base

class Department(Base):
    __tablename__ = 'departments'

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)

    designations = relationship("Designation", cascade="all, delete-orphan", back_populates="department")
    employees = relationship("Employee", cascade="all, delete-orphan", back_populates="department")

    def as_dict(self):
        return {col.name: getattr(self, col.name) for col in self.__table__.columns}
