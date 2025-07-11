from sqlalchemy import Column, Integer, Date, ForeignKey,UniqueConstraint 
from sqlalchemy.orm import relationship
from models.base import Base

class Timesheet(Base):
    __tablename__ = 'timesheets'

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_id = Column(Integer, ForeignKey('employees.id', ondelete="CASCADE"), nullable=False)
    week_starting = Column(Date, nullable=False)

        # Ensure each employee can only have one timesheet per week_starting
    __table_args__ = (
        UniqueConstraint('employee_id', 'week_starting', name='uq_employee_week'),
    )

    # Relationship to Employee
    employee = relationship('Employee', back_populates='timesheets')

    # Relationship to DailyLogs
    daily_logs = relationship(
        'DailyLog',
        back_populates='timesheet',
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    def as_dict(self):
        return {column.name: getattr(self, column.name) for column in self.__table__.columns}