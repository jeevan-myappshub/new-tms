import random
from datetime import datetime, timedelta, time, date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()
from config.config import MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB, MYSQL_PORT
from models.base import Base
from models.department import Department
from models.employee import Employee
from models.projects import Project
from models.employee_projects import employee_projects
from models.project_team import ProjectTeam
from models.timesheet import Timesheet
from models.dailylogs import DailyLog
from models.dailylogschanges import DailyLogChange
from models.projectapproval import ProjectApproval

SQLALCHEMY_DATABASE_URI = (
    f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"
)

engine = create_engine(SQLALCHEMY_DATABASE_URI)
Session = sessionmaker(bind=engine)
session = Session()

Base.metadata.drop_all(engine)
Base.metadata.create_all(engine)

departments = [Department(department_name=f"Department {i+1}") for i in range(5)]
session.add_all(departments)
session.commit()

employees = []

# 1 CEO (no manager)
ceo = Employee(
    employee_name="CEO",
    email="ceo@company.com",
    status="active",
    department_id=random.choice(departments).id,
    reports_to=None
)
employees.append(ceo)
session.add(ceo)
session.commit()

# 2 Managers reporting to CEO
managers = []
for i in range(2):
    mgr = Employee(
        employee_name=f"Manager {i+1}",
        email=f"manager{i+1}@company.com",
        status="active",
        department_id=random.choice(departments).id,
        reports_to=ceo.id
    )
    managers.append(mgr)
    employees.append(mgr)
session.add_all(managers)
session.commit()

# 4 Team Leads reporting to Managers
team_leads = []
for i in range(4):
    mgr = managers[i % 2]
    tl = Employee(
        employee_name=f"TeamLead {i+1}",
        email=f"teamlead{i+1}@company.com",
        status="active",
        department_id=random.choice(departments).id,
        reports_to=mgr.id
    )
    team_leads.append(tl)
    employees.append(tl)
session.add_all(team_leads)
session.commit()

# 13 Employees reporting to Team Leads
for i in range(13):
    tl = team_leads[i % 4]
    emp = Employee(
        employee_name=f"Employee {i+1}",
        email=f"employee{i+1}@company.com",
        status="active",
        department_id=random.choice(departments).id,
        reports_to=tl.id
    )
    employees.append(emp)
session.add_all(employees[7:])  # Only the new employees
session.commit()

# Print hierarchy
def print_hierarchy(emp_list, parent_id=None, level=0):
    for emp in [e for e in emp_list if e.reports_to == parent_id]:
        print("  " * level + f"{emp.employee_name} (id={emp.id})")
        print_hierarchy(emp_list, emp.id, level + 1)

print("\nEmployee Hierarchy:")
print_hierarchy(employees)

# --- Seed Projects ---
projects = []
for i in range(10):
    proj = Project(
        project_name=f"Project {i+1}",
        description=f"Description for project {i+1}",
        manager_id=random.choice(employees).id
    )
    projects.append(proj)
session.add_all(projects)
session.commit()

# --- Assign Employees to Projects ---
for emp in employees:
    assigned_projects = random.sample(projects, k=random.randint(1, 3))
    for proj in assigned_projects:
        session.execute(employee_projects.insert().values(employee_id=emp.id, project_id=proj.id))
session.commit()

# --- Project Team Roles ---
roles = ['manager', 'team_lead', 'member']
for proj in projects:
    team_members = random.sample(employees, k=random.randint(3, 7))
    for idx, emp in enumerate(team_members):
        role = roles[0] if idx == 0 else random.choice(roles[1:])
        pt = ProjectTeam(project_id=proj.id, employee_id=emp.id, role=role)
        session.add(pt)
session.commit()

# --- Timesheets and DailyLogs ---
for emp in employees:
    for week in range(2):  # 2 weeks per employee
        week_start = date.today() - timedelta(days=7 * week)
        ts = Timesheet(employee_id=emp.id, week_starting=week_start)
        session.add(ts)
        session.flush()
        for day in range(random.randint(5, 7)):
            log_date = week_start + timedelta(days=day)
            for _ in range(random.randint(1, 2)):
                start_hour = random.randint(8, 15)
                end_hour = start_hour + random.randint(1, 3)
                start_time = time(start_hour, 0)
                end_time = time(min(end_hour, 18), 0)
                project = random.choice(projects)
                dl = DailyLog(
                    timesheet_id=ts.id,
                    project_id=project.id,
                    log_date=log_date,
                    start_time=start_time,
                    end_time=end_time,
                    total_hours=str(end_hour - start_hour),
                    description=f"Worked on {project.project_name}"
                )
                session.add(dl)
session.commit()

# --- DailyLogChanges and Approvals ---
all_daily_logs = session.query(DailyLog).all()
sample_logs = random.sample(all_daily_logs, k=min(20, len(all_daily_logs)))

for dl in sample_logs:
    change = DailyLogChange(
        daily_log_id=dl.id,
        project_id=dl.project_id,
        changed_at=datetime.now(),
        change_description="Correction to hours"
    )
    session.add(change)
    session.flush()
    approval = ProjectApproval(
        daily_log_change_id=change.id,
        manager_id=random.choice(employees).id,
        status=random.choice(['pending', 'approved', 'rejected']),
        comments="Reviewed",
        reviewed_at=datetime.now()
    )
    session.add(approval)
session.commit()

print("\nSeeded 70+ records across tables successfully!")