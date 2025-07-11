from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from config.config import SQLALCHEMY_DATABASE_URI, SQLALCHEMY_TRACK_MODIFICATIONS
from datetime import datetime, timedelta
from utils.session_manager import get_session
from utils.helpers import safe_close  # <-- import safe_close from helpers.py
from models.employee import Employee
from models.department import Department
from models.designation import Designation
from models.timesheet import Timesheet
from models.dailylogs import DailyLog
from models.project import Project
from sqlalchemy.exc import IntegrityError

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

app.config['SQLALCHEMY_DATABASE_URI'] = SQLALCHEMY_DATABASE_URI
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = SQLALCHEMY_TRACK_MODIFICATIONS
db = SQLAlchemy(app)

# ---------------- Employee Profile with Department & Designation ----------------
@app.route("/api/employees/profile-with-hierarchy", methods=["GET"])
def get_employee_profile_with_hierarchy():
    email = request.args.get('email')
    session = get_session()
    try:
        emp = session.query(Employee).filter(Employee.email.ilike(email)).first()
        if not emp:
            return jsonify({'error': 'Employee not found.'}), 404

        # Manager hierarchy
        hierarchy = []
        current = emp
        while current.manager:
            manager = current.manager
            hierarchy.append({
                'id': manager.id,
                'employee_name': manager.employee_name,
                'email': manager.email,
                'reports_to': manager.reports_to_id,
                'designation': manager.designation.as_dict() if manager.designation else None
            })
            current = manager

        # Department info
        department = emp.department.as_dict() if emp.department else None
        designation = emp.designation.as_dict() if emp.designation else None

        return jsonify({
            'employee': emp.as_dict(),
            'manager_hierarchy': hierarchy,
            'department': department,
            'designation': designation
        }), 200
    finally:
        safe_close(session)

# ---------------- Project List ----------------
@app.route("/api/projects", methods=["GET"])
def list_projects():
    session = get_session()
    try:
        projects = session.query(Project).all()
        return jsonify([p.as_dict() for p in projects]), 200
    finally:
        safe_close(session)

# ---------------- Timesheet CRUD ----------------
@app.route("/api/timesheets", methods=["POST"])
def add_timesheet():
    session = get_session()
    try:
        data = request.get_json()
        employee_id = data.get("employee_id")
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        if not employee_id or not start_date or not end_date:
            return jsonify({"error": "employee_id, start_date, end_date required"}), 400
        # Only one timesheet per employee per week (start_date)
        existing = session.query(Timesheet).filter_by(
            employee_id=employee_id, start_date=start_date
        ).first()
        if existing:
            return jsonify(existing.as_dict()), 200
        ts = Timesheet(employee_id=employee_id, start_date=start_date, end_date=end_date)
        session.add(ts)
        session.commit()
        return jsonify(ts.as_dict()), 201
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)

@app.route("/api/timesheets/by-employee-week", methods=["GET"])
def get_timesheet_by_week():
    session = get_session()
    try:
        employee_id = request.args.get("employee_id")
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        ts = session.query(Timesheet).filter_by(
            employee_id=employee_id, start_date=start_date, end_date=end_date
        ).first()
        if not ts:
            return jsonify({"error": "Timesheet not found"}), 404
        return jsonify(ts.as_dict()), 200
    finally:
        safe_close(session)

@app.route("/api/timesheets/<int:timesheet_id>/daily-logs", methods=["GET"])
def logs_by_timesheet(timesheet_id):
    session = get_session()
    try:
        logs = session.query(DailyLog).filter_by(timesheet_id=timesheet_id).all()
        return jsonify([log.as_dict() for log in logs]), 200
    finally:
        safe_close(session)

# ---------------- Daily Logs: Save Multiple ----------------
from datetime import datetime, time

@app.route("/api/daily-logs/save", methods=["POST"])
def save_daily_logs():
    session = get_session()
    try:
        logs = request.get_json()
        if not logs or not isinstance(logs, list):
            return jsonify({'error': 'Invalid or no logs provided. Expected a list.'}), 400
        
        saved_logs = []
        for log_data in logs:
            log_id = log_data.get('id')
            timesheet_id = log_data.get('timesheet_id')
            log_date = log_data.get('log_date')
            project_id = log_data.get('project_id')
            start_time_str = log_data.get('start_time')
            end_time_str = log_data.get('end_time')
            total_hours = log_data.get('total_hours')
            task_description = log_data.get('task_description', '')

            # Validate required fields
            if not all([timesheet_id, log_date, project_id, start_time_str, end_time_str, total_hours]):
                return jsonify({'error': 'Missing required fields in log data.'}), 400

            # Parse date and time
            try:
                log_date_obj = datetime.strptime(log_date, '%Y-%m-%d').date()
                start_time_obj = datetime.strptime(start_time_str, '%H:%M').time()
                end_time_obj = datetime.strptime(end_time_str, '%H:%M').time()
            except ValueError:
                return jsonify({'error': 'Invalid date or time format. Expected YYYY-MM-DD and HH:MM.'}), 400

            # Validate timesheet and project existence
            timesheet = session.query(Timesheet).get(timesheet_id)
            if not timesheet:
                return jsonify({'error': f'Timesheet with id {timesheet_id} not found.'}), 404

            project = session.query(Project).get(project_id)
            if not project:
                return jsonify({'error': f'Project with id {project_id} not found.'}), 404

            if log_id:
                # Update existing log
                log = session.query(DailyLog).get(log_id)
                if not log:
                    return jsonify({'error': f'Daily log with id {log_id} not found.'}), 404

                # Log change history if description or project_id changed
                if log.task_description != task_description or log.project_id != project_id:
                    change = DailyLogChange(
                        daily_log_id=log.id,
                        project_id=project_id,
                        new_description=task_description,
                        changed_at=datetime.utcnow()
                    )
                    session.add(change)

                log.project_id = project_id
                log.start_time = start_time_obj
                log.end_time = end_time_obj
                log.total_hours = total_hours
                log.task_description = task_description
                log.log_date = log_date_obj
            else:
                # Create new log
                log = DailyLog(
                    timesheet_id=timesheet_id,
                    log_date=log_date_obj,
                    project_id=project_id,
                    start_time=start_time_obj,
                    end_time=end_time_obj,
                    total_hours=total_hours,
                    task_description=task_description
                )
                session.add(log)

            saved_logs.append({
                'id': log.id,
                'timesheet_id': log.timesheet_id,
                'log_date': log.log_date.strftime('%Y-%m-%d'),
                'project_id': log.project_id,
                'start_time': log.start_time.strftime('%H:%M'),
                'end_time': log.end_time.strftime('%H:%M'),
                'total_hours': log.total_hours,
                'task_description': log.task_description
            })

        session.commit()
        return jsonify(saved_logs), 200
    except IntegrityError as e:
        session.rollback()
        return jsonify({'error': 'Database integrity error: ' + str(e)}), 400
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


# ---------------- Run App ----------------
if __name__ == '__main__':
    app.run(debug=True)