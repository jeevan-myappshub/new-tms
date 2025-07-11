from flask import Blueprint, request, jsonify
from models.project import Project
from utils.session_manager import get_session, safe_close


# Get all projects
def get_projects():
    session = get_session()
    try:
        projects = session.query(Project).all()
        return jsonify([p.as_dict() for p in projects]), 200
    finally:
        safe_close(session)

# Get a single project by ID
def get_project(project_id):
    session = get_session()
    try:
        project = session.query(Project).get(project_id)
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        return jsonify(project.as_dict()), 200
    finally:
        safe_close(session)

# Create a new project

def create_project():
    session = get_session()
    try:
        data = request.get_json()
        name = data.get('name')
        description = data.get('description', '')
        if not name:
            return jsonify({'error': 'Project name is required'}), 400
        if session.query(Project).filter_by(name=name).first():
            return jsonify({'error': 'Project with this name already exists'}), 400
        project = Project(name=name, description=description)
        session.add(project)
        session.commit()
        return jsonify(project.as_dict()), 201
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)

def update_project(project_id):
    session = get_session()
    try:
        data = request.get_json()
        project = session.query(Project).get(project_id)
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        if 'name' in data:
            project.name = data['name']
        if 'description' in data:
            project.description = data['description']
        session.commit()
        return jsonify(project.as_dict()), 200
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)


def delete_project(project_id):
    session = get_session()
    try:
        project = session.query(Project).get(project_id)
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        session.delete(project)
        session.commit()
        return jsonify({'message': 'Project deleted'}), 200
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        safe_close(session)