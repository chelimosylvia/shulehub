from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User, Class, Assignment, Submission
from datetime import datetime

student_bp = Blueprint('student', __name__, url_prefix='/api/students')

@student_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def student_dashboard():
    student_id = get_jwt_identity()
    student = User.query.get_or_404(student_id)
    
    if student.role != 'student':
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Get student's classes
    classes = student.classes
    classes_data = []
    
    for class_ in classes:
        classes_data.append({
            'id': class_.id,
            'name': class_.name,
            'teacher': f"{class_.teacher.first_name} {class_.teacher.last_name}",
            'subject': class_.subject
        })
    
    # Get assignments with submission status
    assignments = []
    for class_ in classes:
        for assignment in class_.assignments:
            submission = Submission.query.filter_by(
                assignment_id=assignment.id,
                student_id=student_id
            ).first()
            
            assignments.append({
                'id': assignment.id,
                'title': assignment.title,
                'class_id': class_.id,
                'class_name': class_.name,
                'due_date': assignment.due_date.isoformat(),
                'description': assignment.description,
                'submitted': submission is not None,
                'submitted_date': submission.submitted_at.isoformat() if submission else None,
                'grade': submission.grade if submission else None,
                'feedback': submission.feedback if submission else None
            })
    
    return jsonify({
        'student': {
            'id': student.id,
            'name': f"{student.first_name} {student.last_name}",
            'grade_level': student.grade_level
        },
        'classes': classes_data,
        'assignments': assignments
    })