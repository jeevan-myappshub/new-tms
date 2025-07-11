from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from models.base import Base

class ProjectTeam(Base):
    __tablename__ = 'project_team'

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey('projects.id', ondelete="CASCADE"), nullable=False)
    employee_id = Column(Integer, ForeignKey('employees.id', ondelete="CASCADE"), nullable=False)
    role = Column(String(50), nullable=False)  # e.g., 'manager', 'team_lead', 'member'

    # Relationships
    project = relationship('Project', back_populates='team_members')
    employee = relationship('Employee', back_populates='project_roles')

    def as_dict(self):
        return {column.name: getattr(self, column.name) for column in self.__table__.columns}