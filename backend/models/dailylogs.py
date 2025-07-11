from sqlalchemy import Column, Integer, String, ForeignKey, Time, Date
from sqlalchemy.orm import relationship
from models.base import Base
from models.dailylogchanges import DailyLogChange  # Move import to the top

class DailyLog(Base):
    __tablename__ = 'daily_logs'

    id = Column(Integer, primary_key=True)
    timesheet_id = Column(Integer, ForeignKey('timesheets.id', ondelete='CASCADE'), nullable=False)
    project_id = Column(Integer, ForeignKey('projects.id', ondelete='SET NULL'), nullable=True)
    log_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    total_hours = Column(Integer, nullable=False)
    task_description = Column(String(255), nullable=False)

    timesheet = relationship("Timesheet", back_populates="daily_logs")
    project = relationship("Project", back_populates="daily_logs")

    daily_log_changes = relationship(  # ✅ Moved inside class
        "DailyLogChange",
        back_populates="daily_log",
        cascade="all, delete-orphan"
    )

    def as_dict(self):
        return {
            "id": self.id,
            "timesheet_id": self.timesheet_id,
            "project_id": self.project_id,
            "log_date": self.log_date.isoformat(),
            "start_time": self.start_time.strftime('%H:%M'),
            "end_time": self.end_time.strftime('%H:%M'),
            "total_hours": self.total_hours,
            "task_description": self.task_description
        }
