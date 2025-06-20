from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from models import School, User
from extensions import db
from collections import defaultdict

student_bp = Blueprint('student_dashboard', __name__, url_prefix='/api/schools/<int:school_id>/student')

@student_bp.route('/<int:school_id>/students/<string:admission_number>/dashboard')
@jwt_required()
def student_dashboard(school_id, admission_number):
    try:
        current_user = get_jwt_identity()
        user_id = current_user['id'] if isinstance(current_user, dict) else current_user

        student = User.query.filter_by(
            id=user_id,
            school_id=school_id,
            role='student'
        ).first_or_404()

        school = School.query.filter_by(id=school_id).first()
        if not school:
            return jsonify({'message': 'School not found'}), 404

        return jsonify({
            'student': {
                'id': student.id,
                'name': f"{student.first_name} {student.last_name}",
                'class': f"Grade {student.grade_level}" if student.grade_level else "N/A",
                'admission_number': student.admission_number
            },
            'school': {
                'id': school.id,
                'name': school.name
            },
            'stats': {},
            'academics': {},
            'timetable': [],
            'announcements': [],
            'upcoming_events': []
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


def get_student_stats(student_id, school_id):
    today = datetime.today()
    return {
        'attendance': {
            'monthly': 95,  # Example %
            'overall': 89
        },
        'assignments': {
            'completed': 5,
            'pending': 2
        }
    }

def get_student_academics(student_id):
    return {
        'grades': [
            {'subject': 'Math', 'score': 'A'},
            {'subject': 'Science', 'score': 'B+'}
        ],
        'performance': 'Above Average'
    }

def get_current_timetable(student_id):
    return [
        {'day': 'Monday', 'subject': 'Math', 'time': '08:00 - 09:00'},
        {'day': 'Monday', 'subject': 'English', 'time': '09:00 - 10:00'}
    ]

def get_student_announcements(school_id):
    return [
        {'title': 'Term Opening', 'date': '2025-06-20', 'content': 'School reopens next Monday!'}
    ]

def get_upcoming_events(school_id):
    return [
        {'event': 'Science Fair', 'date': '2025-07-01'}
    ]


# Additional helper functions would go here...