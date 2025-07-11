from sqlalchemy import Table, Column, Integer, ForeignKey
from models.base import Base

employee_projects = Table(
    'employee_projects',
    Base.metadata,
    Column('employee_id', Integer, ForeignKey('employees.id', ondelete="CASCADE"), primary_key=True),
    Column('project_id', Integer, ForeignKey('projects.id', ondelete="CASCADE"), primary_key=True)
)