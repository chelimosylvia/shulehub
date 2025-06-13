from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_
from models import User
from extensions import db


user_bp = Blueprint('user', __name__)

@user_bp.route('/', methods=['GET'])
@jwt_required()
def get_users():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Only admins can view all users
        if current_user.role != 'admin':
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 100)
        search = request.args.get('search', '').strip()
        role = request.args.get('role', '').strip()
        active_only = request.args.get('active', '').lower() != 'false'
        
        # Build query
        query = User.query
        
        if active_only:
            query = query.filter_by(is_active=True)
        
        if search:
            query = query.filter(
                or_(
                    User.first_name.ilike(f'%{search}%'),
                    User.last_name.ilike(f'%{search}%'),
                    User.email.ilike(f'%{search}%')
                )
            )
        
        if role:
            query = query.filter(User.role == role)
        
        # Execute paginated query
        users = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        return jsonify({
            'users': [user.to_dict() for user in users.items],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': users.total,
                'pages': users.pages,
                'has_next': users.has_next,
                'has_prev': users.has_prev
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch users', 'details': str(e)}), 500

@user_bp.route('/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Users can view their own profile, admins can view any profile
        if current_user.role != 'admin' and current_user_id != user_id:
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Include additional user details
        user_data = user.to_dict()
        
        # Add enrollment information for students
        if user.role == 'student':
            enrollments = Enrollment.query.filter_by(user_id=user_id).all()
            enrollment_data = []
            for enrollment in enrollments:
                enrollment_dict = enrollment.to_dict()
                school = School.query.get(enrollment.school_id)
                if school:
                    enrollment_dict['school_name'] = school.name
                enrollment_data.append(enrollment_dict)
            user_data['enrollments'] = enrollment_data
        
        # Add owned schools for teachers/admins
        elif user.role in ['teacher', 'admin']:
            schools = School.query.filter_by(owner_id=user_id, is_active=True).all()
            user_data['owned_schools'] = [school.to_dict() for school in schools]
        
        return jsonify({'user': user_data}), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch user', 'details': str(e)}), 500

@user_bp.route('/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Users can update their own profile, admins can update any profile
        if current_user.role != 'admin' and current_user_id != user_id:
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        # Update allowed fields
        if 'first_name' in data:
            user.first_name = data['first_name'].strip()
        if 'last_name' in data:
            user.last_name = data['last_name'].strip()
        if 'phone' in data:
            user.phone = data['phone'].strip()
        
        # Only admins can update role and active status
        if current_user.role == 'admin':
            if 'role' in data and data['role'] in ['student', 'parent', 'teacher', 'admin']:
                user.role = data['role']
            if 'is_active' in data:
                user.is_active = bool(data['is_active'])
        
        # Email update requires validation
        if 'email' in data:
            new_email = data['email'].lower().strip()
            if new_email != user.email:
                if User.query.filter_by(email=new_email).first():
                    return jsonify({'error': 'Email already in use'}), 409
                user.email = new_email
        
        db.session.commit()
        
        return jsonify({
            'message': 'User updated successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update user', 'details': str(e)}), 500

@user_bp.route('/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Only admins can delete users, and they can't delete themselves
        if current_user.role != 'admin':
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        if current_user_id == user_id:
            return jsonify({'error': 'Cannot delete your own account'}), 400
        
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Soft delete by deactivating the account
        user.is_active = False
        db.session.commit()
        
        return jsonify({'message': 'User deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete user', 'details': str(e)}), 500

@user_bp.route('/teachers', methods=['GET'])
@jwt_required()
def get_teachers():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Only admins and teachers can view teacher list
        if current_user.role not in ['admin', 'teacher']:
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        teachers = User.query.filter_by(role='teacher', is_active=True).all()
        
        return jsonify({
            'teachers': [teacher.to_dict() for teacher in teachers]
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch teachers', 'details': str(e)}), 500

@user_bp.route('/students', methods=['GET'])
@jwt_required()
def get_students():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Only admins and teachers can view student list
        if current_user.role not in ['admin', 'teacher']:
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        # Get query parameters
        school_id = request.args.get('school_id', type=int)
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        
        if school_id:
            # Get students enrolled in a specific school
            enrollments = db.session.query(Enrollment, User).join(
                User, Enrollment.user_id == User.id
            ).filter(
                Enrollment.school_id == school_id,
                Enrollment.status == 'active',
                User.is_active == True
            ).paginate(
                page=page,
                per_page=per_page,
                error_out=False
            )
            
            students = []
            for enrollment, student in enrollments.items:
                student_data = student.to_dict()
                student_data['enrollment'] = enrollment.to_dict()
                students.append(student_data)
            
            return jsonify({
                'students': students,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': enrollments.total,
                    'pages': enrollments.pages,
                    'has_next': enrollments.has_next,
                    'has_prev': enrollments.has_prev
                }
            }), 200
        else:
            # Get all students
            students = User.query.filter_by(role='student', is_active=True).paginate(
                page=page,
                per_page=per_page,
                error_out=False
            )
            
            return jsonify({
                'students': [student.to_dict() for student in students.items],
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': students.total,
                    'pages': students.pages,
                    'has_next': students.has_next,
                    'has_prev': students.has_prev
                }
            }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch students', 'details': str(e)}), 500

@user_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_user_stats():
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Only admins can view user statistics
        if current_user.role != 'admin':
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        # Get user statistics
        total_users = User.query.count()
        active_users = User.query.filter_by(is_active=True).count()
        students = User.query.filter_by(role='student').count()
        teachers = User.query.filter_by(role='teacher').count()
        parents = User.query.filter_by(role='parent').count()
        admins = User.query.filter_by(role='admin').count()
        
        # Get enrollment statistics
        total_enrollments = Enrollment.query.count()
        active_enrollments = Enrollment.query.filter_by(status='active').count()
        
        return jsonify({
            'user_stats': {
                'total_users': total_users,
                'active_users': active_users,
                'students': students,
                'teachers': teachers,
                'parents': parents,
                'admins': admins
            },
            'enrollment_stats': {
                'total_enrollments': total_enrollments,
                'active_enrollments': active_enrollments
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch statistics', 'details': str(e)}), 500