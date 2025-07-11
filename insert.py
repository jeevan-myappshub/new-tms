import random
from datetime import datetime, timedelta, time, date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os
import urllib.parse

# Set random seed for reproducibility
random.seed(42)

# Load environment variables
load_dotenv()
from config.config import MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB, MYSQL_PORT
from models.base import Base
from models.employee import Employee
from models.department import Department
from models.projects import Project
from models.employee_projects import employee_projects
from models.project_team import ProjectTeam
from models.timesheet import Timesheet
from models.dailylogs import DailyLog
from models.dailylogschanges import DailyLogChange
from models.projectapproval import ProjectApproval

# Database connection with escaped credentials
SQLALCHEMY_DATABASE_URI = (
    f"mysql+pymysql://{urllib.parse.quote(MYSQL_USER)}:{urllib.parse.quote(MYSQL_PASSWORD)}@"
    f"{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"
)

try:
    engine = create_engine(SQLALCHEMY_DATABASE_URI)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Drop and recreate all tables
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)

    # Configuration
    NUM_MANAGERS = 4
    NUM_TEAM_LEADS_PER_MANAGER = 2
    TOTAL_EMPLOYEES = 50
    NUM_PROJECTS = 10
    NUM_WEEKS = 2
    BASE_DATE = date(2025, 7, 1)  # Fixed reference date

    employees = []

    # 1 CEO (no manager)
    ceo = Employee(
        employee_name="CEO",
        email="ceo@company.com",
        status="active",
        reports_to=None
    )
    session.add(ceo)
    session.commit()
    employees.append(ceo)

    # Managers reporting to CEO
    managers = []
    for i in range(NUM_MANAGERS):
        mgr = Employee(
            employee_name=f"Manager {i+1}",
            email=f"manager{i+1}@company.com",
            status="active",
            reports_to=ceo.id
        )
        session.add(mgr)
        managers.append(mgr)
    session.commit()
    employees.extend(managers)

    # Team Leads (2 per manager)
    team_leads = []
    for i, mgr in enumerate(managers):
        for j in range(NUM_TEAM_LEADS_PER_MANAGER):
            tl = Employee(
                employee_name=f"TeamLead {i*NUM_TEAM_LEADS_PER_MANAGER+j+1}",
                email=f"teamlead{i*NUM_TEAM_LEADS_PER_MANAGER+j+1}@company.com",
                status="active",
                reports_to=mgr.id
            )
            session.add(tl)
            team_leads.append(tl)
    session.commit()
    employees.extend(team_leads)

    # Regular Employees
    num_regular_employees = TOTAL_EMPLOYEES - (1 + NUM_MANAGERS + len(team_leads))
    regular_employees = []
    for i in range(num_regular_employees):
        tl = team_leads[i % len(team_leads)]
        emp = Employee(
            employee_name=f"Employee {i+1}",
            email=f"employee{i+1}@company.com",
            status="active",
            reports_to=tl.id
        )
        session.add(emp)
        regular_employees.append(emp)
    session.commit()
    employees.extend(regular_employees)

    # Seed Departments
    departments = []
    department_names = ["Engineering", "Human Resources", "Finance", "Sales", "Marketing", "IT", "Support"]
    for name in department_names:
        dept = Department(name=name)
        session.add(dept)
        departments.append(dept)
    session.commit()

    # Assign Departments to Employees
    for idx, emp in enumerate(employees):
        emp.department_id = departments[idx % len(departments)].id
    session.commit()

    # Print hierarchy for verification
    def print_hierarchy(emp_list, parent_id=None, level=0):
        for emp in [e for e in emp_list if e.reports_to == parent_id]:
            print("  " * level + f"{emp.employee_name} (id={emp.id})")
            print_hierarchy(emp_list, emp.id, level + 1)

    print("\nEmployee Hierarchy:")
    print_hierarchy(employees)

    # Seed Projects (managers only as project managers)
    projects = []
    for i in range(NUM_PROJECTS):
        proj = Project(
            project_name=f"Project {i+1}",
            description=f"Description for project {i+1}",
            manager_id=random.choice(managers + team_leads).id  # Restrict to managers or team leads
        )
        session.add(proj)
        projects.append(proj)
    session.commit()

    # Assign Employees to Projects
    for emp in employees:
        assigned_projects = random.sample(projects, k=random.randint(1, 3))
        for proj in assigned_projects:
            session.execute(employee_projects.insert().values(employee_id=emp.id, project_id=proj.id))
    session.commit()

    # Project Team Roles
    roles = ['manager', 'team_lead', 'member']
    for proj in projects:
        team_members = random.sample(employees, k=random.randint(5, 10))
        for idx, emp in enumerate(team_members):
            # Ensure only managers/team leads are assigned as 'manager' or 'team_lead'
            if idx == 0:
                role = 'manager' if emp in managers else 'team_lead' if emp in team_leads else 'member'
            else:
                role = 'team_lead' if emp in team_leads else 'member'
            pt = ProjectTeam(project_id=proj.id, employee_id=emp.id, role=role)
            session.add(pt)
    session.commit()

    # Timesheets and DailyLogs
    for emp in employees:
        for week in range(NUM_WEEKS):
            week_start = BASE_DATE - timedelta(days=7 * week)
            ts = Timesheet(employee_id=emp.id, week_starting=week_start)
            session.add(ts)
            session.flush()
            for day in range(random.randint(5, 7)):
                log_date = week_start + timedelta(days=day)
                for _ in range(random.randint(1, 2)):
                    start_hour = random.randint(8, 15)
                    end_hour = start_hour + random.randint(1, 3)
                    if end_hour > 18:
                        end_hour = 18  # Cap at 6 PM
                    start_time = time(start_hour, 0)
                    end_time = time(end_hour, 0)
                    total_hours = end_hour - start_hour
                    project = random.choice(projects)
                    dl = DailyLog(
                        timesheet_id=ts.id,
                        project_id=project.id,
                        log_date=log_date,
                        start_time=start_time,
                        end_time=end_time,
                        total_hours=total_hours,  # Store as numeric
                        description=f"Worked on {project.project_name}"
                    )
                    session.add(dl)
    session.commit()

    # DailyLogChanges and Approvals
    all_daily_logs = session.query(DailyLog).all()
    sample_logs = random.sample(all_daily_logs, k=min(50, len(all_daily_logs)))
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
            manager_id=random.choice(managers + team_leads).id,  # Restrict to managers/team leads
            status=random.choice(['pending', 'approved', 'rejected']),
            comments="Reviewed",
            reviewed_at=datetime.now()
        )
        session.add(approval)
    session.commit()

    print(f"\nSeeded {TOTAL_EMPLOYEES} employees and related records across tables successfully!")

except Exception as e:
    print(f"An error occurred: {str(e)}")
    session.rollback()
finally:
    session.close()