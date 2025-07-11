from sqlalchemy import Column, Integer, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from models.base import Base

class Timesheet(Base):
    __tablename__ = 'timesheets'

    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey('employees.id', ondelete='CASCADE'), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)

    employee = relationship("Employee", back_populates="timesheets")
    daily_logs = relationship("DailyLog", back_populates="timesheet", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint('employee_id', 'start_date', name='uix_employee_week'),)

    def as_dict(self):
        return {
            "id": self.id,
            "employee_id": self.employee_id,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "daily_logs": [log.as_dict() for log in self.daily_logs]
        }
