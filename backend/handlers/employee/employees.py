from flask import request, jsonify
from models.employee import Employee
from models.timesheet import Timesheet
from models.dailylogs import DailyLog
from utils.session_manager import get_session
from utils.helpers import is_valid_email, safe_close
from datetime import datetime, timedelta

# Create employee
def create_employee():
    session = get_session()
    try:
        data = request.get_json()
        name = data.get('employee_name')
        email = data.get('email')
        reports_to = data.get('reports_to')
        manager_name = data.get('manager_name')

        if not name or not email:
            return jsonify({'error': 'employee_name and email are required.'}), 400
        if not is_valid_email(email):
            return jsonify({'error': 'Invalid email format'}), 422

        manager_id = None
        if manager_name:
            manager = session.query(Employee).filter_by(employee_name=manager_name).first()
            if not manager:
                return jsonify({'error': 'Manager not found.'}), 404
            manager_id = manager.id
        elif reports_to:
            if str(reports_to).lower() == 'self':
                return jsonify({'error': 'Employee cannot report to themselves.'}), 400
            manager = session.query(Employee).get(reports_to)
            if not manager:
                return jsonify({'error': 'Manager not found.'}), 404
            manager_id = manager.id

        new_employee = Employee(employee_name=name, email=email, reports_to=manager_id)
        session.add(new_employee)
        session.commit()

        return jsonify({
            'id': new_employee.id,
            'employee_name': new_employee.employee_name,
            'email': new_employee.email,
            'reports_to': new_employee.reports_to
        }), 201
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)

# Get all employees
def get_employees():
    session = get_session()
    try:
        employees = session.query(Employee).all()
        return jsonify([{
            'id': emp.id,
            'employee_name': emp.employee_name,
            'email': emp.email,
            'reports_to': emp.reports_to
        } for emp in employees]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)

# Get employee by email
def get_employee_by_email():
    session = get_session()
    try:
        email = request.args.get('email')
        if not email:
            return jsonify({'error': 'email query param required.'}), 400
        emp = session.query(Employee).filter_by(email=email).first()
        if not emp:
            return jsonify({'error': 'Employee not found.'}), 404
        return jsonify({
            'id': emp.id,
            'employee_name': emp.employee_name,
            'email': emp.email,
            'reports_to': emp.reports_to
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)

# Update employee by email
def update_employee_by_email():
    session = get_session()
    try:
        email = request.args.get('email')
        if not email:
            return jsonify({'error': 'email query param required.'}), 400
        emp = session.query(Employee).filter_by(email=email).first()
        if not emp:
            return jsonify({'error': 'Employee not found.'}), 404

        data = request.get_json()
        new_email = data.get('email', emp.email)
        if new_email and not is_valid_email(new_email):
            return jsonify({'error': 'Invalid email format'}), 422

        emp.employee_name = data.get('employee_name', emp.employee_name)
        emp.email = new_email

        reports_to_email = data.get('reports_to_email')
        manager_name = data.get('manager_name')

        if reports_to_email:
            manager = session.query(Employee).filter_by(email=reports_to_email).first()
            if not manager or manager.id == emp.id:
                return jsonify({'error': 'Invalid manager'}), 400
            emp.reports_to = manager.id
        elif manager_name:
            manager = session.query(Employee).filter_by(employee_name=manager_name).first()
            if not manager or manager.id == emp.id:
                return jsonify({'error': 'Invalid manager'}), 400
            emp.reports_to = manager.id

        session.commit()
        return jsonify({
            'id': emp.id,
            'employee_name': emp.employee_name,
            'email': emp.email,
            'reports_to': emp.reports_to
        }), 200
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)

# Delete employee by email
def delete_employee_by_email():
    session = get_session()
    try:
        email = request.args.get('email')
        if not email:
            return jsonify({'error': 'email query param required.'}), 400
        emp = session.query(Employee).filter_by(email=email).first()
        if not emp:
            return jsonify({'error': 'Employee not found.'}), 404

        # Set subordinates' manager to None
        subordinates = session.query(Employee).filter(Employee.reports_to == emp.id).all()
        for sub in subordinates:
            sub.reports_to = None

        session.delete(emp)
        session.commit()
        return jsonify({'message': 'Employee deleted successfully. Subordinates updated.'}), 200
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)

# Get subordinates
def get_subordinates(manager_id):
    session = get_session()
    try:
        manager = session.query(Employee).get(manager_id)
        if not manager:
            return jsonify({'error': 'Manager not found.'}), 404

        subordinates = manager.subordinates
        return jsonify({
            'manager_id': manager.id,
            'manager_name': manager.employee_name,
            'subordinates': [{
                'id': sub.id,
                'employee_name': sub.employee_name,
                'email': sub.email,
                'reports_to': sub.reports_to
            } for sub in subordinates]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)

# Get employees without manager
def get_employees_without_manager():
    session = get_session()
    try:
        employees = session.query(Employee).filter(Employee.reports_to == None).all()
        return jsonify([{
            'id': emp.id,
            'employee_name': emp.employee_name,
            'email': emp.email,
            'reports_to': emp.reports_to
        } for emp in employees]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)

# Get manager hierarchy
def get_manager_hierarchy_by_email():
    session = get_session()
    try:
        email = request.args.get('email')
        if not email:
            return jsonify({'error': 'email query param required.'}), 400
        emp = session.query(Employee).filter_by(email=email).first()
        if not emp:
            return jsonify({'error': 'Employee not found.'}), 404

        hierarchy = []
        current = emp
        while current.reports_to:
            manager = session.query(Employee).get(current.reports_to)
            if not manager:
                break
            hierarchy.append({
                'id': manager.id,
                'employee_name': manager.employee_name,
                'email': manager.email,
                'reports_to': manager.reports_to
            })
            current = manager

        return jsonify({
            'employee_id': emp.id,
            'employee_name': emp.employee_name,
            'manager_hierarchy': hierarchy
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)

# Get employee tree
def get_employee_tree(employee_id):
    session = get_session()
    try:
        root = session.query(Employee).get(employee_id)
        if not root:
            return jsonify({'error': 'Employee not found.'}), 404

        def build_tree(emp):
            return {
                'id': emp.id,
                'employee_name': emp.employee_name,
                'email': emp.email,
                'reports_to': emp.reports_to,
                'subordinates': [build_tree(sub) for sub in emp.subordinates]
            }

        tree = build_tree(root)
        return jsonify(tree), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)

# Get employee dashboard
def get_employee_dashboard():
    session = get_session()
    try:
        email = request.args.get('email')
        week_starting = request.args.get('week_starting')  # e.g., "5/16/2022"
        if not email:
            return jsonify({'error': 'email query param required.'}), 400

        emp = session.query(Employee).filter_by(email=email).first()
        if not emp:
            return jsonify({'error': 'Employee not found.'}), 404

        # Manager hierarchy
        hierarchy = []
        current = emp
        while current.reports_to:
            manager = session.query(Employee).get(current.reports_to)
            if not manager:
                break
            hierarchy.append({
                'id': manager.id,
                'employee_name': manager.employee_name,
                'email': manager.email,
                'reports_to': manager.reports_to
            })
            current = manager

        # Parse week_starting date
        timesheets_data = []
        daily_logs_data = []
        if week_starting:
            try:
                week_start = datetime.strptime(week_starting, '%m/%d/%Y')
                week_end = week_start + timedelta(days=6)
                timesheets = session.query(Timesheet).filter(
                    Timesheet.employee_id == emp.id,
                    Timesheet.week_starting >= week_start,
                    Timesheet.week_starting <= week_end
                ).all()
                timesheet_ids = [ts.id for ts in timesheets]
                timesheets_data = [ts.as_dict() for ts in timesheets]
                if timesheet_ids:
                    logs = session.query(DailyLog).filter(
                        DailyLog.timesheet_id.in_(timesheet_ids),
                        DailyLog.log_date >= week_start,
                        DailyLog.log_date <= week_end
                    ).all()
                    daily_logs_data = [log.as_dict() for log in logs] 
            except ValueError:
                return jsonify({'error': 'Invalid week_starting format. Use MM/DD/YYYY.'}), 400
        else:
            timesheets = session.query(Timesheet).filter_by(employee_id=emp.id).all()
            timesheet_ids = [ts.id for ts in timesheets]
            timesheets_data = [ts.as_dict() for ts in timesheets]
            if timesheet_ids:
                logs = session.query(DailyLog).filter(DailyLog.timesheet_id.in_(timesheet_ids)).all()
                daily_logs_data = [log.as_dict() for log in logs]

        return jsonify({
            'employee': {
                'id': emp.id,
                'employee_name': emp.employee_name,
                'email': emp.email,
                'reports_to': emp.reports_to
            },
            'manager_hierarchy': hierarchy,
            'timesheets': timesheets_data,
            'daily_logs': daily_logs_data
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)