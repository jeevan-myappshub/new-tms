from flask import request, jsonify
from models.timesheet import Timesheet
from models.employee import Employee
from utils.session_manager import get_session
from utils.helpers import safe_close
from datetime import datetime

# Create a timesheet - POST /timesheets
def create_timesheet():
    session = get_session()
    try:
        data = request.get_json()
        employee_name = data.get("employee_name")
        week_starting = data.get("week_starting")

        if not employee_name or not week_starting:
            return jsonify({"error": "employee_name and week_starting are required"}), 400

        try:
            week_starting_date = datetime.strptime(week_starting, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"error": "Invalid week_starting format. Use YYYY-MM-DD."}), 400

        employee = session.query(Employee).filter(Employee.employee_name.ilike(employee_name)).first()
        if not employee:
            return jsonify({"error": "Employee not found"}), 404

        # --- Check for existing timesheet ---
        existing_ts = session.query(Timesheet).filter_by(
            employee_id=employee.id,
            week_starting=week_starting_date
        ).first()
        if existing_ts:
            return jsonify(existing_ts.as_dict()), 200  # Already exists, return it

        # --- Create new timesheet ---
        new_ts = Timesheet(employee_id=employee.id, week_starting=week_starting_date)
        session.add(new_ts)
        session.commit()
        return jsonify(new_ts.as_dict()), 201
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)

# Get all timesheets - GET /timesheets
def get_timesheets():
    session = get_session()
    try:
        timesheets = session.query(Timesheet).all()
        return jsonify([ts.as_dict() for ts in timesheets]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)

# Get timesheet by ID - GET /timesheets/<id>
def get_timesheet(ts_id):
    session = get_session()
    try:
        ts = session.query(Timesheet).get(ts_id)
        if not ts:
            return jsonify({"error": "Timesheet not found"}), 404
        return jsonify(ts.as_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)

# Get timesheets by week - GET /timesheets-by-week?week_starting=YYYY-MM-DD
def get_timesheets_by_week():
    session = get_session()
    try:
        week_starting = request.args.get("week_starting")
        if not week_starting:
            return jsonify({"error": "week_starting query param required"}), 400
        try:
            week_starting_date = datetime.strptime(week_starting, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"error": "Invalid week_starting format. Use YYYY-MM-DD."}), 400
        timesheets = session.query(Timesheet).filter_by(week_starting=week_starting_date).all()
        return jsonify([ts.as_dict() for ts in timesheets]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)

# Get timesheets by employee name - GET /timesheets/by-employee-name?employee_name=John Doe
def get_timesheets_by_employee_name():
    session = get_session()
    try:
        employee_name = request.args.get("employee_name")
        if not employee_name:
            return jsonify({"error": "employee_name query param required"}), 400

        employee = session.query(Employee).filter(Employee.employee_name.ilike(employee_name)).first()
        if not employee:
            return jsonify({"error": "Employee not found"}), 404

        timesheets = session.query(Timesheet).filter_by(employee_id=employee.id).all()
        return jsonify([ts.as_dict() for ts in timesheets]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)

# Get timesheet by employee name and week - GET /timesheets/by-employee-name-week?employee_name=John Doe&week_starting=YYYY-MM-DD
def get_timesheet_by_employee_name_and_week():
    session = get_session()
    try:
        employee_name = request.args.get("employee_name")
        week_starting = request.args.get("week_starting")
        if not employee_name or not week_starting:
            return jsonify({"error": "employee_name and week_starting query params required"}), 400

        try:
            week_starting_date = datetime.strptime(week_starting, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"error": "Invalid week_starting format. Use YYYY-MM-DD."}), 400

        employee = session.query(Employee).filter(Employee.employee_name.ilike(employee_name)).first()
        if not employee:
            return jsonify({"error": "Employee not found"}), 404

        ts = session.query(Timesheet).filter_by(employee_id=employee.id, week_starting=week_starting_date).first()
        if not ts:
            return jsonify({"error": "Timesheet not found"}), 404

        return jsonify(ts.as_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)

# Update timesheet by employee name and week - PUT /timesheets/by-employee-name-week
def update_timesheet_by_employee_name_and_week():
    session = get_session()
    try:
        data = request.get_json()
        employee_name = data.get("employee_name")
        week_starting = data.get("week_starting")
        new_week_starting = data.get("new_week_starting")

        if not employee_name or not week_starting or not new_week_starting:
            return jsonify({"error": "employee_name, week_starting, and new_week_starting are required"}), 400

        try:
            week_starting_date = datetime.strptime(week_starting, '%Y-%m-%d').date()
            new_week_starting_date = datetime.strptime(new_week_starting, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

        employee = session.query(Employee).filter(Employee.employee_name.ilike(employee_name)).first()
        if not employee:
            return jsonify({"error": "Employee not found"}), 404

        ts = session.query(Timesheet).filter_by(employee_id=employee.id, week_starting=week_starting_date).first()
        if not ts:
            return jsonify({"error": "Timesheet not found"}), 404

        ts.week_starting = new_week_starting_date
        session.commit()
        return jsonify(ts.as_dict()), 200
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)

# Delete timesheet by employee name and week - DELETE /timesheets/by-employee-name-week
def delete_timesheet_by_employee_name_and_week():
    session = get_session()
    try:
        employee_name = request.args.get("employee_name")
        week_starting = request.args.get("week_starting")
        if not employee_name or not week_starting:
            return jsonify({"error": "employee_name and week_starting query params required"}), 400

        try:
            week_starting_date = datetime.strptime(week_starting, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"error": "Invalid week_starting format. Use YYYY-MM-DD."}), 400

        employee = session.query(Employee).filter(Employee.employee_name.ilike(employee_name)).first()
        if not employee:
            return jsonify({"error": "Employee not found"}), 404

        ts = session.query(Timesheet).filter_by(employee_id=employee.id, week_starting=week_starting_date).first()
        if not ts:
            return jsonify({"error": "Timesheet not found"}), 404

        session.delete(ts)
        session.commit()
        return jsonify({"message": "Timesheet deleted successfully."}), 200
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)