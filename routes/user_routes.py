from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from werkzeug.security import generate_password_hash
from models import User, School, Subject, teacher_subject, SchoolClass, Enrollment
from sqlalchemy.exc import IntegrityError
from extensions import db
from datetime import datetime
import traceback
import string
import secrets
import re

user_bp = Blueprint('users', __name__, url_prefix='/api/users')

@user_bp.route('/<int:school_id>/create', methods=['POST'])
@jwt_required()
def create_user(school_id):
    """Create a new user (student, teacher, or admin)"""
    try:
        # ===== AUTHENTICATION & AUTHORIZATION =====
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'Invalid user token'}), 401
            
        if current_user.role not in ['school_admin', 'system_owner']:
            return jsonify({'error': 'Insufficient permissions'}), 403

        # ===== REQUEST VALIDATION =====
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400
            
        data = request.get_json()
        
        # Validate school exists
        school = School.query.get(school_id)
        if not school:
            return jsonify({'error': 'School not found'}), 404

        # ===== FIELD VALIDATION =====
        role = data.get('role')
        if role not in ['student', 'teacher', 'school_admin']:
            return jsonify({'error': 'Invalid role specified'}), 400

        # Field requirements by role
        required_fields = {
            'student': ['first_name', 'last_name', 'admission_number', 'class_id', 'parent_phone'],
            'teacher': ['first_name', 'last_name', 'email'],
            'school_admin': ['first_name', 'last_name', 'email']
        }
        
        missing = [field for field in required_fields[role] if field not in data]
        if missing:
            return jsonify({
                'error': f'Missing required fields for {role}: {", ".join(missing)}',
                'required_fields': required_fields[role],
                'received_data': data
            }), 400

        # ===== PASSWORD GENERATION =====
        def generate_secure_password():
            alphabet = string.ascii_letters + string.digits
            while True:
                password = ''.join(secrets.choice(alphabet) for _ in range(10))
                if (
                    any(c.islower() for c in password)
                    and any(c.isupper() for c in password)
                    and any(c.isdigit() for c in password)
                ):    
                    return password

        try:
            default_password = generate_secure_password()
            password_hash = generate_password_hash(default_password)
        except Exception as e:
            return jsonify({'error': f'Password generation failed: {str(e)}'}), 500

        # ===== USER DATA PREPARATION =====
        user_data = {
            'first_name': data['first_name'].strip(),
            'last_name': data['last_name'].strip(),
            'password_hash': password_hash,
            'role': role,
            'school_id': school_id,
            'must_change_password': True,
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }

        # ===== ROLE-SPECIFIC PROCESSING =====
        if role == 'student':
            # Validate class exists and belongs to school
            class_id = data.get('class_id')
            school_class = SchoolClass.query.filter_by(
                id=class_id,
                school_id=school_id,
                is_active=True
            ).first()
            
            if not school_class:
                return jsonify({'error': 'Invalid or inactive class specified'}), 400

            # Validate class capacity
            if school_class.current_enrollment >= school_class.capacity:
                return jsonify({
                    'error': f'Class {school_class.name} has reached its capacity of {school_class.capacity} students'
                }), 400

            # Validate parent phone format
            parent_phone = data.get('parent_phone', '').strip()
            if not re.match(r'^\+?[\d\s-]{10,15}$', parent_phone):
                return jsonify({'error': 'Invalid parent phone number format'}), 400

            user_data.update({
                'admission_number': data['admission_number'].strip().upper(),
                'parent_phone': parent_phone,
                'email': None,
                'tsc_number': None,
                'national_id': None,
                'phone': None
            })

            # Check for duplicate admission number
            if User.query.filter_by(
                admission_number=user_data['admission_number'],
                school_id=school_id
            ).first():
                return jsonify({
                    'error': f"Admission number {user_data['admission_number']} already exists",
                    'details': {
                        'admission_number': user_data['admission_number'],
                        'school_id': school_id
                    }
                }), 400

        elif role == 'teacher':
            # Handle phone number (accept both 'phone' and 'phone_number')
            phone = data.get('phone') or data.get('phone_number')
            if not phone:
                return jsonify({
                    'error': 'Phone number is required',
                    'received_fields': list(data.keys())
                }), 400

            # Handle teacher ID (TSC or National ID)
            teacher_id = data.get('teacher_id', '').strip().upper()
            
            if teacher_id.startswith('TSC'):
                tsc_number = teacher_id
                national_id = None
            elif teacher_id.isdigit() and len(teacher_id) >= 6:
                national_id = teacher_id
                tsc_number = None
            else:
                return jsonify({
                    'error': 'Teacher ID must be TSC (TSC12345) or National ID (6+ digits)',
                    'received_id': teacher_id
                }), 400

            # Check for duplicates
            if tsc_number and User.query.filter_by(tsc_number=tsc_number).first():
                return jsonify({'error': f'TSC number {tsc_number} already exists'}), 400
            if national_id and User.query.filter_by(national_id=national_id).first():
                return jsonify({'error': f'National ID {national_id} already exists'}), 400

            # Validate subjects if provided
            subject_ids = data.get('subjects', [])
            valid_subjects = []
            if subject_ids:
                if not isinstance(subject_ids, list):
                    return jsonify({'error': 'Subjects must be an array'}), 400
                
                valid_subjects = Subject.query.filter(
                    Subject.id.in_(subject_ids),
                    Subject.school_id == school_id
                ).all()
                
                if len(valid_subjects) != len(subject_ids):
                    return jsonify({
                        'error': 'Invalid subjects provided',
                        'invalid_subjects': list(set(subject_ids) - {s.id for s in valid_subjects})
                    }), 400

            user_data.update({
                'tsc_number': tsc_number,
                'national_id': national_id,
                'phone': phone.strip(),
                'email': data['email'].strip().lower()
            })

            # Check for duplicate email
            if User.query.filter_by(email=user_data['email']).first():
                return jsonify({
                    'error': 'Email already exists',
                    'email': user_data['email']
                }), 400

        elif role == 'school_admin':
            user_data.update({
                'email': data['email'].strip().lower(),
                'tsc_number': None,
                'national_id': None,
                'phone': None
            })
            
            if User.query.filter_by(email=user_data['email']).first():
                return jsonify({
                    'error': 'Email already exists',
                    'email': user_data['email']
                }), 400

        # ===== USER CREATION =====
        try:
            new_user = User(**user_data)
            db.session.add(new_user)
            
            # For teachers, add subjects through the association table
            if role == 'teacher' and valid_subjects:
                new_user.subjects = valid_subjects
            
            db.session.commit()

            # For students, create enrollment record
            if role == 'student':
                # Get current academic year (you might want to make this configurable)
                current_year = datetime.now().year
                academic_year = f"{current_year}-{current_year + 1}"
                
                enrollment = Enrollment(
                    user_id=new_user.id,
                    school_id=school_id,
                    class_id=class_id,
                    admission_number=user_data['admission_number'],
                    enrollment_date=datetime.utcnow().date(),
                    status='active',
                    academic_year=academic_year
                )
                db.session.add(enrollment)
                
                # Update class enrollment count
                school_class.current_enrollment += 1
                
                db.session.commit()

            response_data = {
                'message': f"{role.title()} created successfully",
                'user_id': new_user.id,
                'temporary_password': default_password,
                'password_change_required': True,
                'user': new_user.to_dict(),
                'enrollment': enrollment.to_dict() if role == 'student' else None
            }

            return jsonify(response_data), 201

        except IntegrityError as e:
            db.session.rollback()
            return jsonify({
                'error': 'Database integrity error',
                'details': str(e.orig) if hasattr(e, 'orig') else str(e)
            }), 400
        except Exception as e:
            db.session.rollback()
            return jsonify({
                'error': 'User creation failed',
                'details': str(e)
            }), 500

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500

@user_bp.route('', methods=['GET'])
@jwt_required()
def get_users():
    """Get users for the current school with enhanced teacher subject data"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.role not in ['school_admin', 'system_owner']:
            return jsonify({'error': 'Unauthorized'}), 403
            
        # Get query parameters
        role_filter = request.args.get('role')
        active_only = request.args.get('active', 'true').lower() == 'true'
        
        # Base query
        query = User.query.filter_by(school_id=current_user.school_id)
        
        # Apply filters
        if role_filter:
            query = query.filter_by(role=role_filter)
        if active_only:
            query = query.filter_by(is_active=True)
            
        users = query.all()
        
        # Enhanced user data with subjects for teachers
        users_data = []
        for user in users:
            user_dict = user.to_dict()
            if user.role == 'teacher':
                user_dict['subjects'] = [{
                    'id': sub.id,
                    'name': sub.name
                } for sub in user.subjects]
            users_data.append(user_dict)
        
        return jsonify({
            'users': users_data,
            'count': len(users_data)
        }), 200
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': 'Failed to fetch users'}), 500

@user_bp.route('/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    """Get specific user details with enhanced information"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # Authorization - admins or the user themselves
        if not current_user or (current_user.id != user_id and current_user.role not in ['school_admin', 'system_owner']):
            return jsonify({'error': 'Unauthorized'}), 403
            
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = user.to_dict()
        
        # Add subjects for teachers
        if user.role == 'teacher':
            user_data['subjects'] = [{
                'id': sub.id,
                'name': sub.name
            } for sub in user.subjects]
            
        return jsonify(user_data), 200
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': 'Failed to fetch user'}), 500

@user_bp.route('/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    """Update user information with enhanced role-specific handling"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # Authorization - admins or the user themselves
        if not current_user or (current_user.id != user_id and current_user.role not in ['school_admin', 'system_owner']):
            return jsonify({'error': 'Unauthorized'}), 403
            
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
        if 'is_active' in data and current_user.role in ['school_admin', 'system_owner']:
            user.is_active = bool(data['is_active'])
            
        # Role-specific updates
        if user.role == 'student' and 'grade_level' in data:
            try:
                grade_level = int(data['grade_level'])
                if grade_level < 7 or grade_level > 12:
                    return jsonify({'error': 'Grade level must be between 7-12'}), 400
                user.grade_level = grade_level
            except (ValueError, TypeError):
                return jsonify({'error': 'Invalid grade level format'}), 400
                
        elif user.role == 'teacher':
            # Handle teacher ID update
            if 'teacher_id' in data:
                teacher_id = data['teacher_id'].strip()
                if teacher_id and User.query.filter(
                    User.teacher_id == teacher_id,
                    User.id != user.id
                ).first():
                    return jsonify({'error': 'Teacher ID already in use'}), 400
                user.teacher_id = teacher_id if teacher_id else None
            
            # Handle subjects update
            if 'subjects' in data:
                # Validate subjects exist
                subjects = data['subjects']
                valid_subjects = Subject.query.filter(
                    Subject.id.in_(subjects),
                    Subject.school_id == user.school_id
                ).all()
                
                if len(valid_subjects) != len(subjects):
                    return jsonify({'error': 'One or more invalid subjects provided'}), 400
                
                # Clear existing subjects and add new ones
                TeacherSubject.query.filter_by(teacher_id=user.id).delete()
                for subject_id in subjects:
                    teacher_subject = TeacherSubject(
                        teacher_id=user.id,
                        subject_id=subject_id
                    )
                    db.session.add(teacher_subject)
            
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'User updated successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        traceback.print_exc()
        return jsonify({'error': 'Failed to update user'}), 500

@user_bp.route('/<int:user_id>/dashboard-settings', methods=['PUT'])
@jwt_required()
def update_user_dashboard_settings(user_id):
    current_user_id = get_jwt_identity()
    if current_user_id != user_id:
        return jsonify({'error': 'Unauthorized access'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing settings data'}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    try:
        # Example logic: store user-level branding preference in a JSON field
        user.dashboard_settings = data  # adjust based on your schema
        user.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify({'message': 'User settings saved', 'user': user.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update settings', 'details': str(e)}), 500
