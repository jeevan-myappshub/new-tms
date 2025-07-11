from sqlalchemy import Column, Integer, String
from models.base import Base

class Department(Base):
    __tablename__ = 'departments'

    id = Column(Integer, primary_key=True, autoincrement=True)
    department_name = Column(String(100), nullable=False, unique=True)

    # Remove this block to avoid backref conflict:
    # employees = relationship(
    #     'Employee',
    #     backref='department',
    #     cascade="all, delete-orphan",
    #     passive_deletes=True
    # )

    def as_dict(self):
        return {column.name: getattr(self, column.name) for column in self.__table__.columns}