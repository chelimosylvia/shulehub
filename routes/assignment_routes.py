from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Assignment, Submission, User
from datetime import datetime
from extensions import db

assignment_bp = Blueprint('assignment', __name__, url_prefix='/api/assignments')

@assignment_bp.route('/<int:assignment_id>/submit', methods=['POST'])
@jwt_required()
def submit_assignment(assignment_id):
    student_id = get_jwt_identity()
    student = User.query.get(student_id)
    
    if not student or student.role != 'student':
        return jsonify({'error': 'Unauthorized'}), 403
    
    assignment = Assignment.query.get(assignment_id)
    if not assignment:
        return jsonify({'error': 'Assignment not found'}), 404
    
    # Check if already submitted
    existing = Submission.query.filter_by(
        assignment_id=assignment_id,
        student_id=student_id
    ).first()
    
    if existing:
        return jsonify({'error': 'Already submitted'}), 400
    
    data = request.get_json()
    if not data or 'content' not in data:
        return jsonify({'error': 'Content is required'}), 400
    
    # Create new submission
    submission = Submission(
        assignment_id=assignment_id,
        student_id=student_id,
        submitted_at=datetime.utcnow(),
        content=data['content']
    )
    
    db.session.add(submission)
    db.session.commit()
    
    return jsonify({
        'message': 'Assignment submitted successfully',
        'submission': {
            'id': submission.id,
            'submitted_at': submission.submitted_at.isoformat()
        }
    }), 201

@assignment_bp.route('/<int:assignment_id>/grade', methods=['POST'])
@jwt_required()
def grade_assignment(assignment_id):
    teacher_id = get_jwt_identity()
    teacher = User.query.get(teacher_id)
    
    if not teacher or teacher.role != 'teacher':
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.get_json()
    if not data or 'submission_id' not in data or 'grade' not in data:
        return jsonify({'error': 'Submission ID and grade are required'}), 400
    
    submission = Submission.query.filter_by(
        id=data['submission_id'],
        assignment_id=assignment_id
    ).first()
    
    if not submission:
        return jsonify({'error': 'Submission not found'}), 404
    
    # Verify the assignment belongs to the teacher
    if submission.assignment.teacher_id != teacher_id:
        return jsonify({'error': 'Unauthorized to grade this assignment'}), 403
    
    submission.grade = data['grade']
    submission.feedback = data.get('feedback', '')
    submission.graded_at = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({
        'message': 'Assignment graded successfully',
        'submission': {
            'id': submission.id,
            'grade': submission.grade,
            'feedback': submission.feedback
        }
    }), 200