from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from models import School, User
from extensions import db

teacher_bp = Blueprint('teacher_dashboard', __name__, url_prefix='/api/schools/<int:school_id>/teacher')

@teacher_bp.route('/<int:school_id>/teacher/dashboard')
@jwt_required()
def teacher_dashboard(school_id):
    try:
        current_user = get_jwt_identity()
        user_id = current_user['id'] if isinstance(current_user, dict) else current_user
        
        teacher = User.query.filter_by(
            id=user_id,
            school_id=school_id,
            role='teacher'
        ).first_or_404()

        return jsonify({
            'teacher': {
                'id': teacher.id,
                'name': teacher.full_name,
                'subjects': teacher.subjects_taught
            },
            'classes': get_teacher_classes(teacher.id),
            'attendance': get_class_attendance_stats(teacher.id),
            'assignments': get_recent_assignments(teacher.id),
            'grading': get_grading_summary(teacher.id)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_teacher_classes(teacher_id):
    """Get classes taught by this teacher"""
    return Class.query.filter_by(teacher_id=teacher_id).all()

# Additional helper functions would go here...