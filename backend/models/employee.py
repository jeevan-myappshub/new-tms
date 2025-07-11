# models/employee.py

from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from models.base import Base

class Employee(Base):
    __tablename__ = 'employees'

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False)
    department_id = Column(Integer, ForeignKey('departments.id', ondelete='CASCADE'))
    designation_id = Column(Integer, ForeignKey('designations.id', ondelete='SET NULL'))
    reports_to_id = Column(Integer, ForeignKey('employees.id'), nullable=True)  # 👈 Manager field

    department = relationship("Department", back_populates="employees")
    designation = relationship("Designation", back_populates="employees")
    timesheets = relationship("Timesheet", back_populates="employee", cascade="all, delete-orphan")


    manager = relationship("Employee", remote_side=[id], backref="subordinates")  # 👈 Self-relationship

    def as_dict(self):
        data = {col.name: getattr(self, col.name) for col in self.__table__.columns}
        if self.manager:
            data['reports_to'] = self.manager.employee_name
        return data
