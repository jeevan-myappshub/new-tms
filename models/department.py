from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from models.base import Base

class Department(Base):
    __tablename__ = 'departments'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)

    # Relationship to Employee (one-to-many)
    employees = relationship('Employee', backref='department')

    def as_dict(self):
        return {column.name: getattr(self, column.name) for column in self.__table__.columns}