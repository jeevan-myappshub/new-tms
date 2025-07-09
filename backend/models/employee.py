from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship, backref
from models.base import Base
from models.employee_projects import employee_projects

class Employee(Base):
    __tablename__ = 'employees'

    id = Column(Integer, primary_key=True, autoincrement=True)
    employee_name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False, unique=True)
    reports_to = Column(Integer, ForeignKey('employees.id', ondelete="SET NULL"), nullable=True)
    status = Column(String(20), nullable=False, default='active')  # 'active' or 'inactive'
    department_id = Column(Integer, ForeignKey('departments.id', ondelete="SET NULL"), nullable=True)

    # Self-referencing relationship: manager and subordinates
    manager = relationship('Employee', remote_side=[id], backref=backref('subordinates', lazy='dynamic'))

    # Relationship to Department
    department = relationship('Department', backref='employees')

    # Many-to-many relationship to Projects
    projects = relationship(
        'Project',
        secondary=employee_projects,
        back_populates='employees'
    )

    # Project team roles (with role info)
    project_roles = relationship('ProjectTeam', back_populates='employee', cascade="all, delete-orphan")

    # Relationship to Timesheet
    timesheets = relationship(
        'Timesheet',
        back_populates='employee',
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    def as_dict(self):
        return {column.name: getattr(self, column.name) for column in self.__table__.columns}

    def set_status(self, session, new_status):
        """Set the employee's status to 'active' or 'inactive'."""
        if new_status not in ('active', 'inactive'):
            raise ValueError("Status must be 'active' or 'inactive'")
        self.status = new_status
        session.add(self)

    @classmethod
    def active(cls, session):
        """Return a query for only active employees."""
        return session.query(cls).filter(cls.status == 'active')

    @classmethod
    def inactive(cls, session):
        """Return a query for only inactive employees."""
        return session.query(cls).filter(cls.status == 'inactive')