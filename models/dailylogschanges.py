from sqlalchemy import Column, Integer, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from models.base import Base

class DailyLogChange(Base):
    __tablename__ = 'daily_log_changes'

    id = Column(Integer, primary_key=True, autoincrement=True)
    daily_log_id = Column(Integer, ForeignKey('daily_logs.id', ondelete="CASCADE"), nullable=False)
    project_id = Column(Integer, ForeignKey('projects.id', ondelete="SET NULL"), nullable=True)  # <-- Add this line
    changed_at = Column(DateTime, nullable=False)
    change_description = Column(Text, nullable=True)

    # Relationship to DailyLog
    daily_log = relationship('DailyLog', back_populates='changes')

    # Relationship to Project
    project = relationship('Project', backref='daily_log_changes')  # <-- Add this line

    def as_dict(self):
        return {column.name: getattr(self, column.name) for column in self.__table__.columns}