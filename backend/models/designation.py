# models/designation.py
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from models.base import Base

class Designation(Base):
    __tablename__ = 'designations'

    id = Column(Integer, primary_key=True)
    title = Column(String(100), nullable=False)
    department_id = Column(Integer, ForeignKey('departments.id', ondelete='CASCADE'))

    department = relationship("Department", back_populates="designations")
    employees = relationship("Employee", back_populates="designation", passive_deletes=True)

    def as_dict(self):
        return {
            "id": self.id,
            "title": self.title
        }