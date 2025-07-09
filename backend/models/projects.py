from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from models.base import Base
from models.employee_projects import employee_projects  # <-- Add this import

class Project(Base):
    __tablename__ = 'projects'

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    manager_id = Column(Integer, ForeignKey('employees.id', ondelete="SET NULL"), nullable=True)

    # Relationship to Manager (Employee)
    manager = relationship('Employee', backref='managed_projects')

    # Many-to-many relationship to Employees
    employees = relationship(
        'Employee',
        secondary=employee_projects,
        back_populates='projects'
    )

    # Project team members (with roles)
    team_members = relationship('ProjectTeam', back_populates='project', cascade="all, delete-orphan")

    # Relationship to DailyLog
    daily_logs = relationship(
        'DailyLog',
        backref='project',
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    def as_dict(self):
        return {column.name: getattr(self, column.name) for column in self.__table__.columns}