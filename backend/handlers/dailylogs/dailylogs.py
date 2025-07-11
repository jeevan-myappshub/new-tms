from flask import request, jsonify
from datetime import datetime
from models.dailylogs import DailyLog
from models.dailylogschanges import DailyLogChange
from utils.session_manager import get_session
from utils.helpers import calculate_total_hours, format_timedelta_to_time, get_day_of_week, safe_close

# Create daily log - POST /dailylogs
def create_daily_log():
    session = get_session()
    try:
        data = request.get_json()
        required_fields = ['timesheet_id', 'log_date']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400

        try:
            log_date = datetime.strptime(data['log_date'], "%Y-%m-%d").date()
        except ValueError:
            return jsonify({'error': 'Invalid log_date format. Use YYYY-MM-DD.'}), 400

        # Check for existing log for this timesheet and date
        existing_log = session.query(DailyLog).filter_by(
            timesheet_id=data['timesheet_id'],
            log_date=log_date
        ).first()
        if existing_log:
            return jsonify({'error': 'Daily log already exists for this date. Please update instead.'}), 409

        day_of_week = get_day_of_week(log_date)

        morning_in = data.get('morning_in')
        morning_out = data.get('morning_out')
        afternoon_in = data.get('afternoon_in')
        afternoon_out = data.get('afternoon_out')

        fmt = "%H:%M"
        try:
            morning_in = datetime.strptime(morning_in, fmt).time() if morning_in else None
            morning_out = datetime.strptime(morning_out, fmt).time() if morning_out else None
            afternoon_in = datetime.strptime(afternoon_in, fmt).time() if afternoon_in else None
            afternoon_out = datetime.strptime(afternoon_out, fmt).time() if afternoon_out else None
        except ValueError:
            return jsonify({'error': 'Invalid time format. Use HH:MM.'}), 400

        total_td = calculate_total_hours(morning_in, morning_out, afternoon_in, afternoon_out)
        total_time_str = format_timedelta_to_time(total_td)

        log = DailyLog(
            timesheet_id=data['timesheet_id'],
            log_date=log_date,
            day_of_week=day_of_week,
            morning_in=morning_in,
            morning_out=morning_out,
            afternoon_in=afternoon_in,
            afternoon_out=afternoon_out,
            total_hours=total_time_str,
            description=data.get('description')
        )
        session.add(log)
        session.commit()
        return jsonify(log.as_dict()), 201
    except Exception as e:
       session.rollback()
       print("Error in create_daily_log:", e)  # <--- Add this line
       return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)

# Update daily log - PUT /dailylogs/<id>
def update_daily_log(log_id):
    session = get_session()
    try:
        log = session.query(DailyLog).get(log_id)
        if not log:
            return jsonify({'error': 'Daily log not found'}), 404

        data = request.get_json()
        old_description = log.description

        if 'log_date' in data:
            try:
                log.log_date = datetime.strptime(data['log_date'], "%Y-%m-%d").date()
                log.day_of_week = get_day_of_week(log.log_date)
            except ValueError:
                return jsonify({'error': 'Invalid log_date format. Use YYYY-MM-DD.'}), 400

        fmt = "%H:%M"
        try:
            if 'morning_in' in data:
                log.morning_in = datetime.strptime(data['morning_in'], fmt).time() if data['morning_in'] else None
            if 'morning_out' in data:
                log.morning_out = datetime.strptime(data['morning_out'], fmt).time() if data['morning_out'] else None
            if 'afternoon_in' in data:
                log.afternoon_in = datetime.strptime(data['afternoon_in'], fmt).time() if data['afternoon_in'] else None
            if 'afternoon_out' in data:
                log.afternoon_out = datetime.strptime(data['afternoon_out'], fmt).time() if data['afternoon_out'] else None
        except ValueError:
            return jsonify({'error': 'Invalid time format. Use HH:MM.'}), 400

        # Recalculate total hours
        total_td = calculate_total_hours(log.morning_in, log.morning_out, log.afternoon_in, log.afternoon_out)
        log.total_hours = format_timedelta_to_time(total_td)

        if 'description' in data:
            if data['description'] != old_description:
                # Save change in DailyLogChange
                change = DailyLogChange(
                    daily_log_id=log.id,
                    new_description=data['description']
                )
                session.add(change)
            log.description = data['description']

        session.commit()
        return jsonify(log.as_dict()), 200
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)

# Get all daily logs - GET /dailylogs
def get_daily_logs():
    session = get_session()
    try:
        logs = session.query(DailyLog).all()
        return jsonify([log.as_dict() for log in logs]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)

# Get daily log by ID - GET /dailylogs/<id>
def get_daily_log(log_id):
    session = get_session()
    try:
        log = session.query(DailyLog).get(log_id)
        if not log:
            return jsonify({'error': 'Daily log not found'}), 404
        return jsonify(log.as_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)


# Delete daily log - DELETE /dailylogs/<id>
def delete_daily_log(log_id):
    session = get_session()
    try:
        log = session.query(DailyLog).get(log_id)
        if not log:
            return jsonify({'error': 'Daily log not found'}), 404
        session.delete(log)
        session.commit()
        return jsonify({'message': 'Daily log deleted successfully.'}), 200
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)

# Get daily logs by timesheet - GET /timesheets/<timesheet_id>/dailylogs
def get_daily_logs_by_timesheet(timesheet_id):
    session = get_session()
    try:
        logs = session.query(DailyLog).filter_by(timesheet_id=timesheet_id).all()
        return jsonify([log.as_dict() for log in logs]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)