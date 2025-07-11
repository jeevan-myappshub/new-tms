import random
from datetime import date, timedelta, time
from faker import Faker
from utils.session_manager import get_session
from models.department import Department
from models.designation import Designation
from models.employee import Employee
from models.timesheet import Timesheet
from models.dailylogs import DailyLog
from models.project import Project
from models.dailylogchanges import DailyLogChange

fake = Faker()
session = get_session()

try:
    # STEP 1: Insert Departments
    departments_data = ["IT", "HR", "Finance", "Marketing", "Operations"]
    dept_objs = {}

    for name in departments_data:
        dept = session.query(Department).filter_by(name=name).first()
        if not dept:
            dept = Department(name=name)
            session.add(dept)
        dept_objs[name] = dept

    session.flush()

    # STEP 2: Insert Designations
    designation_map = {
        "IT": ["Software Engineer", "DevOps Engineer", "Tech Lead"],
        "HR": ["HR Executive", "HR Manager"],
        "Finance": ["Accountant", "Financial Analyst"],
        "Marketing": ["Marketing Executive", "SEO Specialist"],
        "Operations": ["Operations Executive", "Logistics Manager"]
    }

    designation_levels = {
        "Tech Lead": 1, "HR Manager": 1, "Financial Analyst": 1, "SEO Specialist": 1, "Logistics Manager": 1,
        "DevOps Engineer": 2, "HR Executive": 2, "Accountant": 2, "Marketing Executive": 2, "Operations Executive": 2,
        "Software Engineer": 3,
    }

    designation_objs = []

    for dept_name, titles in designation_map.items():
        for title in titles:
            existing = session.query(Designation).filter_by(title=title, department=dept_objs[dept_name]).first()
            if not existing:
                desig = Designation(title=title, department=dept_objs[dept_name])
                session.add(desig)
                designation_objs.append(desig)

    session.flush()

    # STEP 3: Map designations per department
    designation_by_dept = {}
    all_designations = session.query(Designation).all()
    for desig in all_designations:
        designation_by_dept.setdefault(desig.department_id, []).append(desig)

    # STEP 4: Add Employees with hierarchy
    employees_by_dept_and_level = {}
    employees = []

    for _ in range(50):
        name = fake.name()
        email = fake.unique.email()
        dept = random.choice(list(dept_objs.values()))
        desig_choices = designation_by_dept.get(dept.id, [])

        desig = random.choice(desig_choices)
        title = desig.title
        level = designation_levels.get(title, 99)

        # Assign a manager (1 level higher, same dept)
        potential_managers = employees_by_dept_and_level.get(dept.id, {}).get(level - 1, [])
        manager = random.choice(potential_managers) if potential_managers else None

        emp = Employee(
            employee_name=name,
            email=email,
            department=dept,
            designation=desig,
            manager=manager
        )
        session.add(emp)
        employees.append(emp)

        # Store by dept and level
        employees_by_dept_and_level.setdefault(dept.id, {}).setdefault(level, []).append(emp)

    session.flush()

    # STEP 4.5: Create Projects
    project_objs = []
    for i in range(10):
        pname = f"Project {i+1}"
        proj = session.query(Project).filter_by(name=pname).first()
        if not proj:
            proj = Project(name=pname, description=fake.sentence(nb_words=8))
            session.add(proj)
        project_objs.append(proj)
    session.flush()

    # STEP 5: Create Timesheets, Daily Logs, and DailyLogChanges
    for emp in employees:
        # 1 timesheet per employee for past week
        start_date = date.today() - timedelta(days=7)
        end_date = start_date + timedelta(days=6)

        ts = Timesheet(
            employee=emp,
            start_date=start_date,
            end_date=end_date
        )
        session.add(ts)
        session.flush()  # Get timesheet.id for foreign key

        # Create multiple daily logs for 3 days in the week
        for day_offset in range(3):  # e.g., Monday–Wednesday
            log_date = start_date + timedelta(days=day_offset)
            for _ in range(random.randint(1, 3)):  # 1 to 3 logs per day
                start_hour = random.randint(9, 16)
                duration = random.randint(1, 2)
                project = random.choice(project_objs)
                start_time_obj = time(hour=start_hour)
                end_time_obj = time(hour=start_hour + duration)
                total_hours = duration
                dl = DailyLog(
                    timesheet_id=ts.id,
                    project_id=project.id,
                    log_date=log_date,
                    start_time=start_time_obj,
                    end_time=end_time_obj,
                    total_hours=total_hours,
                    task_description=fake.sentence(nb_words=6)
                )
                session.add(dl)
                session.flush()  # Get dl.id for DailyLogChange

                # Add a DailyLogChange for each log
                change = DailyLogChange(
                    daily_log_id=dl.id,
                    project_id=project.id,
                    new_description=fake.sentence(nb_words=10)
                )
                session.add(change)

    session.commit()
    print("✅ Seeded departments, designations, employees, projects, timesheets, daily logs, and daily log changes.")

except Exception as e:
    session.rollback()
    print("❌ Error during seeding:", e)

finally:
    session.close()