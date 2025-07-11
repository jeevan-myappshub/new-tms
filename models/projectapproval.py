from sqlalchemy import Column, Integer, ForeignKey, DateTime, String, Text
from sqlalchemy.orm import relationship
from models.base import Base

class ProjectApproval(Base):
    __tablename__ = 'project_approvals'

    id = Column(Integer, primary_key=True, autoincrement=True)
    daily_log_change_id = Column(Integer, ForeignKey('daily_log_changes.id', ondelete="CASCADE"), nullable=False)
    manager_id = Column(Integer, ForeignKey('employees.id', ondelete="SET NULL"), nullable=True)
    status = Column(String(20), nullable=False, default='pending')  # 'pending', 'approved', 'rejected'
    comments = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    # Relationships
    daily_log_change = relationship('DailyLogChange', backref='approvals')
    manager = relationship('Employee')

    def as_dict(self):
        return {column.name: getattr(self, column.name) for column in self.__table__.columns}