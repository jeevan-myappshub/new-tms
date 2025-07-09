from sqlalchemy import Column, Integer, Date, String, Time, Text, ForeignKey
from sqlalchemy.orm import relationship

from models.base import Base

class DailyLog(Base):
    __tablename__ = 'daily_logs'

    id = Column(Integer, primary_key=True, autoincrement=True)
    timesheet_id = Column(Integer, ForeignKey('timesheets.id', ondelete="CASCADE"), nullable=False)
    project_id = Column(Integer, ForeignKey('projects.id', ondelete="SET NULL"), nullable=True)
    log_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)      # New: start time for the task
    end_time = Column(Time, nullable=False)        # New: end time for the task
    total_hours = Column(String(10))               # Optionally, store as string or calculate dynamically
    description = Column(Text)

    # Relationship to Timesheet
    timesheet = relationship('Timesheet', back_populates='daily_logs')

    # Relationship to DailyLogChange
    changes = relationship(
        'DailyLogChange',
        back_populates='daily_log',
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    def as_dict(self):
        result = {}
        for column in self.__table__.columns:
            value = getattr(self, column.name)
            # Convert time and date objects to string
            if hasattr(value, 'isoformat'):
                result[column.name] = value.isoformat()
            else:
                result[column.name] = value
        return result