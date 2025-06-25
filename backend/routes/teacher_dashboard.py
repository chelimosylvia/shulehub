from flask import Blueprint, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, create_access_token
from werkzeug.security import check_password_hash
from datetime import datetime, timedelta
from models import School, User, SchoolClass, Enrollment
from extensions import db

teacher_bp = Blueprint('teacher_dashboard', __name__, url_prefix='/api/schools')

@teacher_bp.route('/<int:school_id>/teacher/dashboard')
@jwt_required()
def teacher_dashboard(school_id):
    try:
        current_user = get_jwt_identity()
        user_id = current_user.get('id') if isinstance(current_user, dict) else current_user

        # Get teacher with school verification
        teacher = User.query.filter_by(
            id=user_id,
            school_id=school_id,
            role='teacher'
        ).first()

        if not teacher:
            current_app.logger.error(f"Teacher not found: User {user_id} at school {school_id}")
            return jsonify({
                'error': 'Teacher not found',
                'details': 'You are not registered as a teacher at this school'
            }), 404

        # Get the school directly
        school = School.query.get(school_id)
        if not school:
            current_app.logger.error(f"School not found: {school_id}")
            return jsonify({
                'error': 'School not found',
                'details': 'The specified school does not exist'
            }), 404

        # Get classes with proper error handling
        classes = []
        try:
            classes = SchoolClass.query.filter_by(
                teacher_id=teacher.id,
                school_id=school.id
            ).all()
        except Exception as e:
            current_app.logger.error(f"Error loading classes: {str(e)}")
            classes = []

        # Prepare response data
        response_data = {
            'teacher': {
                'id': teacher.id,
                'full_name': f"{teacher.first_name} {teacher.last_name}",
                'tsc_number': teacher.tsc_number,  # TSC number
                'national_id': teacher.national_id,  # National ID
                'identification': teacher.tsc_number or teacher.national_id or 'Not provided'
            },
            'school': {
                'id': school.id,
                'name': school.name
            },
            'subjects': [subject.name for subject in teacher.subjects] if teacher.subjects else [],
            'classes': [{
                'id': cls.id,
                'name': cls.name,
                'subject': getattr(cls, 'subject', 'General'),
                'student_count': getattr(cls, 'current_enrollment', 0),
                'average_grade': 0  # You'll need to implement this
            } for cls in classes],
            'students': {
                'total': 0,  # Implement student count logic
                'list': []   # Implement student list logic
            },
            'assignments': {
                'upcoming': []  # Implement assignments logic
            }
        }

        return jsonify(response_data)

    except Exception as e:
        current_app.logger.error(f"Dashboard error: {str(e)}", exc_info=True)
        return jsonify({
            'error': 'Failed to load dashboard data',
            'details': str(e)
        }), 500

@teacher_bp.route('/<int:school_id>/teacher/attendance', methods=['POST'])
@jwt_required()
def record_attendance(school_id):
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        date_str = data.get('date')
        records = data.get('records', [])
        class_id = data.get('class_id')

        if not date_str or not class_id or not records:
            return jsonify({'error': 'Missing data'}), 400

        date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()

        for record in records:
            attendance = Attendance(
                student_id=record['student_id'],
                class_id=class_id,
                date=date_obj,
                status=record['status'],
                remarks=record.get('remarks'),
                recorded_by=user_id,
                school_id=school_id
            )
            db.session.add(attendance)

        db.session.commit()
        return jsonify({'message': 'Attendance recorded successfully'}), 201

    except Exception as e:
        print(f"Attendance error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@teacher_bp.route('/<int:school_id>/classes', methods=['GET'])
@jwt_required()
def get_school_classes(school_id):
    """Get all classes for a school"""
    try:
        # Verify school exists
        school = School.query.get_or_404(school_id)

        classes = SchoolClass.query.filter_by(
            school_id=school_id
        ).options(
            db.joinedload(SchoolClass.teacher)  # If you want teacher info
        ).all()

        return jsonify([{
            'id': cls.id,
            'name': cls.name,
            'subject': cls.subject,
            'grade_level': cls.grade_level,
            'teacher_id': cls.teacher_id,
            'teacher_name': f"{cls.teacher.first_name} {cls.teacher.last_name}" if cls.teacher else None
        } for cls in classes])

    except Exception as e:
        current_app.logger.error(f"Error fetching classes: {str(e)}")
        return jsonify({'error': 'Failed to fetch classes'}), 500

@teacher_bp.route('/<int:school_id>/teachers', methods=['GET'])
@jwt_required()
def get_teachers_in_school(school_id):
    try:
        # Get all teacher users in the given school
        teachers = User.query.filter_by(
            school_id=school_id,
            role='teacher'
        ).all()

        return jsonify([
            {
                'id': teacher.id,  # internal ID used for assigning
                'first_name': teacher.first_name,
                'last_name': teacher.last_name,
                'tsc_number': teacher.tsc_number,
                'national_id': teacher.national_id
            } for teacher in teachers
        ])
    except Exception as e:
        current_app.logger.error(f"Failed to fetch teachers: {str(e)}")
        return jsonify({'error': 'Failed to fetch teachers'}), 500

