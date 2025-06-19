from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User, Class, Assignment, Submission
from datetime import datetime
from extensions import db

teacher_bp = Blueprint('teacher', __name__, url_prefix='/api/teachers')

@teacher_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def teacher_dashboard():
    teacher_id = get_jwt_identity()
    teacher = User.query.get_or_404(teacher_id)
    
    if teacher.role != 'teacher':
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Get teacher's classes with student counts
    classes = Class.query.filter_by(teacher_id=teacher_id).all()
    classes_data = []
    
    for class_ in classes:
        classes_data.append({
            'id': class_.id,
            'name': class_.name,
            'student_count': len(class_.students),
            'subject': class_.subject
        })
    
    # Get assignments with submission stats
    assignments = Assignment.query.filter_by(teacher_id=teacher_id).all()
    assignments_data = []
    
    for assignment in assignments:
        submissions = Submission.query.filter_by(assignment_id=assignment.id).all()
        graded = sum(1 for s in submissions if s.grade is not None)
        
        assignments_data.append({
            'id': assignment.id,
            'title': assignment.title,
            'class_id': assignment.class_id,
            'class_name': assignment.class.name,
            'due_date': assignment.due_date.isoformat(),
            'submissions_count': len(submissions),
            'total_students': len(assignment.class.students),
            'graded_submissions': graded
        })
    
    return jsonify({
        'teacher': {
            'id': teacher.id,
            'name': f"{teacher.first_name} {teacher.last_name}",
            'subject': teacher.subject
        },
        'classes': classes_data,
        'assignments': assignments_data
    })

@teacher_bp.route('/classes/<int:class_id>', methods=['GET'])
@jwt_required()
def get_class_details(class_id):
    teacher_id = get_jwt_identity()
    class_ = Class.query.filter_by(id=class_id, teacher_id=teacher_id).first_or_404()
    
    students = []
    for student in class_.students:
        students.append({
            'id': student.id,
            'name': f"{student.first_name} {student.last_name}",
            'admission_number': student.admission_number
        })
    
    return jsonify({
        'class': {
            'id': class_.id,
            'name': class_.name,
            'subject': class_.subject,
            'schedule': class_.schedule,
            'room': class_.room,
            'description': class_.description
        },
        'students': students,
        'materials': get_class_materials(class_id)
    })

def get_class_materials(class_id):
    # Implement your material fetching logic here
    return []