from flask import request, jsonify
from models.dailylogschanges import DailyLogChange
from utils.session_manager import get_session
from utils.helpers import sanitize_description, safe_close

## Create a change - POST /dailylogchanges
def add_log_change():
    session = get_session()
    try:
        data = request.get_json()
        log_id = data.get("daily_log_id")
        new_desc = sanitize_description(data.get("new_description"))

        if not log_id or not new_desc:
            return jsonify({"error": "daily_log_id and new_description are required"}), 400

        change = DailyLogChange(daily_log_id=log_id, new_description=new_desc)
        session.add(change)
        session.commit()
        return jsonify(change.as_dict()), 201
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)

# Get all changes - GET /dailylogchanges
def get_all_log_changes():
    session = get_session()
    try:
        changes = session.query(DailyLogChange).all()
        return jsonify([ch.as_dict() for ch in changes]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)

# Get change by ID - GET /dailylogchanges/<id>
def get_log_change(change_id):
    session = get_session()
    try:
        change = session.query(DailyLogChange).get(change_id)
        if not change:
            return jsonify({"error": "Change not found"}), 404
        return jsonify(change.as_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)

# Update a change - PUT /dailylogchanges/<id>
def update_log_change(change_id):
    session = get_session()
    try:
        change = session.query(DailyLogChange).get(change_id)
        if not change:
            return jsonify({"error": "Change not found"}), 404

        data = request.get_json()
        if "new_description" in data:
            change.new_description = sanitize_description(data["new_description"])
        session.commit()
        return jsonify(change.as_dict()), 200
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)

# Delete a change - DELETE /dailylogchanges/<id>
def delete_log_change(change_id):
    session = get_session()
    try:
        change = session.query(DailyLogChange).get(change_id)
        if not change:
            return jsonify({"error": "Change not found"}), 404
        session.delete(change)
        session.commit()
        return jsonify({"message": "Change deleted successfully."}), 200
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)

# Get change history for a daily log - GET /dailylogs/<daily_log_id>/changes
def get_log_changes(daily_log_id):
    session = get_session()
    try:
        changes = session.query(DailyLogChange).filter_by(daily_log_id=daily_log_id).all()
        return jsonify([ch.as_dict() for ch in changes]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)