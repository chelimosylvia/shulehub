import secrets
import string
import json
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    jwt_required, 
    create_access_token, 
    get_jwt_identity, 
    decode_token, 
    verify_jwt_in_request, 
    create_refresh_token,
    get_jwt
)
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.exc import SQLAlchemyError
from models import School, User
from extensions import db
import traceback



auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/school-admin/login', methods=['POST'])
def school_admin_login():
    """Login for school administrators"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data received'}), 400
            
        # Normalize input
        email = (data.get('email') or '').strip().lower()
        school_code = (data.get('school_code') or '').strip()
        reg_number = (data.get('registration_number') or '').strip()

        # Validate presence
        if not all([email, school_code, reg_number]):
            return jsonify({'error': 'All credentials are required'}), 400

        # Find active school
        school = School.query.filter_by(
            school_code=school_code,
            registration_number=reg_number,
            is_active=True
        ).first()

        if not school:
            return jsonify({'error': 'Invalid school credentials'}), 401

        # Verify email matches school
        if school.email.lower() != email.lower():
            return jsonify({'error': 'Email does not match school records'}), 401

        # Find admin user
        admin_user = User.query.filter_by(
            email=email,
            school_id=school.id,
            role='school_admin',
            is_active=True
        ).first()

        if not admin_user:
            return jsonify({'error': 'No admin account found'}), 404

        # Generate tokens
        access_token = create_access_token(
            identity=str(admin_user.id),
            additional_claims={
                'school_id': school.id,
                'role': 'school_admin',
                'is_owner': school.owner_id == admin_user.id
            }
        )
        refresh_token = create_refresh_token(identity=str(admin_user.id))

        return jsonify({
            'message': 'Login successful',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': admin_user.to_dict(),
            'school': school.to_dict()
        }), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        traceback.print_exc()
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': 'Login failed', 'details': str(e)}), 500

@auth_bp.route('/student/login', methods=['POST'])
def student_login():
    try:
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400

        data = request.get_json()
        
        # Validate required fields
        required_fields = ['school_id', 'admission_number', 'password']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return jsonify({
                'error': 'Missing required fields',
                'missing_fields': missing_fields
            }), 400

        # Convert school_id to integer
        try:
            school_id = int(data['school_id'])
        except ValueError:
            return jsonify({
                'error': 'Invalid school ID - must be a number'
            }), 400

        admission_number = data['admission_number'].strip()
        password = data['password'].strip()

        # Find student
        student = User.query.filter_by(
            school_id=school_id,
            admission_number=admission_number,
            role='student'
        ).first()

        if not student:
            return jsonify({
                'error': 'Invalid credentials',
                'detail': 'No student found with these credentials'
            }), 401

        # Handle first-time login with generated password
        if student.must_change_password:
            # Verify against stored generated password (plain text in password_hash)
            if not check_password_hash(student.password_hash, password):
                return jsonify({
                'error': 'Invalid initial password',
                'hint': 'Please use the system-generated password'
            }), 401

            # Generate temporary token for password change
            # FIX: Convert student.id to string
            access_token = create_access_token(
                identity=str(student.id),  # <-- CHANGED: Convert to string
                additional_claims={
                    'school_id': student.school_id,
                    'role': 'student',
                    'password_change_required': True
                },
                expires_delta=timedelta(minutes=15)
            )

            return jsonify({
                'access_token': access_token,
                'password_change_required': True,
                'user': student.to_dict(),
                'message': 'Please set a new password'
            }), 200

        # Normal login flow (after password change)
        if not student.check_password(password):
            return jsonify({'error': 'Invalid password'}), 401

        if not student.is_active:
            return jsonify({'error': 'Account is inactive'}), 403

        # Generate normal tokens
        # FIX: Convert student.id to string in both tokens
        access_token = create_access_token(
            identity=str(student.id),  # <-- CHANGED: Convert to string
            additional_claims={
                'school_id': student.school_id,
                'role': 'student'
            }
        )
        refresh_token = create_refresh_token(identity=str(student.id))  # <-- CHANGED: Convert to string

        return jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': student.to_dict(),
            'password_change_required': False
        }), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"Database error: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
        
    except Exception as e:
        current_app.logger.error(f"Login error: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500

@auth_bp.route('/teacher/login', methods=['POST'])
def teacher_login():
    try:
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400

        data = request.get_json()

        # Convert school_id to integer - EXPECT ONLY NUMBERS
        try:
            school_id = int(data.get('school_id'))
        except (TypeError, ValueError):
            return jsonify({
                'error': 'Invalid school_id - must be a number',
                'received': data.get('school_id')
            }), 400

        # Validate required fields
        required_fields = ['school_id', 'password']
        if not all(field in data for field in required_fields):
            return jsonify({
                'error': 'Missing required fields',
                'required_fields': required_fields,
                'received_fields': list(data.keys())
            }), 400

        # Must have either tsc_number or national_id
        tsc_number = data.get('tsc_number')
        national_id = data.get('national_id')
        
        if not tsc_number and not national_id:
            return jsonify({
                'error': 'Provide either TSC number or National ID'
            }), 400

        print(f"Teacher login attempt:")
        print(f"  school_id: {school_id}")
        print(f"  tsc_number: {tsc_number}")
        print(f"  national_id: {national_id}")

        # Query for teacher
        query = User.query.filter_by(
            school_id=school_id,
            role='teacher'
        )
        
        if tsc_number:
            teacher = query.filter_by(tsc_number=tsc_number).first()
        else:
            teacher = query.filter_by(national_id=national_id).first()

        if not teacher:
            # Debug: Show what teachers exist for this school
            teachers_in_school = User.query.filter_by(
                school_id=school_id,
                role='teacher'
            ).all()
            print(f"Teachers in school {school_id}: {len(teachers_in_school)}")
            for t in teachers_in_school[:5]:  # Show first 5
                print(f"  - ID: {t.id}, TSC: {t.tsc_number}, National ID: {t.national_id}")
            
            identifier = tsc_number or national_id
            return jsonify({
                'error': 'Invalid credentials',
                'details': f'No teacher found with identifier {identifier} in school {school_id}'
            }), 401

        # Check if account is active
        if not teacher.is_active:
            return jsonify({'error': 'Account is inactive'}), 403

        # Check password - handle both hashed and plain text passwords
        password_valid = False
        password = data['password']
        
        if teacher.password_hash:
            if teacher.password_hash.startswith('$2b$'):
                # Bcrypt hashed password
                password_valid = check_password_hash(teacher.password_hash, password)
            else:
                # System-generated plain text password stored in password_hash field
                password_valid = (teacher.password_hash == password)
        elif hasattr(teacher, 'check_password'):
            password_valid = teacher.check_password(password)

        if not password_valid:
            print(f"Password check failed for teacher {teacher.id}")
            return jsonify({
                'error': 'Invalid credentials',
                'details': 'Password incorrect'
            }), 401

        # Create tokens
        access_token = create_access_token(
            identity=teacher.id,
            additional_claims={
                'school_id': teacher.school_id,
                'role': 'teacher',
                'password_change_required': getattr(teacher, 'must_change_password', False)
            }
        )
        refresh_token = create_refresh_token(identity=teacher.id)

        print(f"Teacher login successful: {teacher.first_name} {teacher.last_name}")

        return jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': teacher.to_dict(),
            'password_change_required': getattr(teacher, 'must_change_password', False)
        }), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({
            'error': 'Login failed',
            'details': str(e)
        }), 500

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token"""
    try:
        current_user = get_jwt_identity()
        user = User.query.get(current_user)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        new_token = create_access_token(
            identity=current_user,
            additional_claims={
                'school_id': user.school_id,
                'role': user.role
            }
        )
        
        return jsonify({
            'access_token': new_token,
            'user': user.to_dict()
        }), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        traceback.print_exc()
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': 'Token refresh failed'}), 500


from flask_jwt_extended import create_access_token

@auth_bp.route('/force-change-password', methods=['POST'])
@jwt_required()
def force_change_password():
    try:
        # 1. Get raw request data
        raw_data = request.get_data(as_text=True)
        current_app.logger.info(f"📥 Raw request: {raw_data}")
        
        # 2. Parse JSON
        try:
            data = json.loads(raw_data) if raw_data else {}
        except json.JSONDecodeError as e:
            current_app.logger.error(f"❌ JSON error: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': 'Invalid JSON format'
            }), 400

        # 3. Validate request
        if not isinstance(data, dict):
            return jsonify({
                'status': 'error',
                'message': 'Request must be a JSON object'
            }), 422
            
        if 'new_password' not in data:
            return jsonify({
                'status': 'error',
                'message': 'new_password field is required'
            }), 422
            
        password = data['new_password'].strip()
        if len(password) < 8:
            return jsonify({
                'status': 'error',
                'message': 'Password must be at least 8 characters'
            }), 422

        # 4. Get and update user
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({
                'status': 'error',
                'message': 'User not found'
            }), 404

        user.password_hash = generate_password_hash(password)
        user.must_change_password = False
        user.updated_at = datetime.utcnow()
        
        db.session.commit()

        # 5. Return success
        return jsonify({
            'status': 'success',
            'message': 'Password updated successfully'
        }), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f"💾 Database error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Database error'
        }), 500
        
    except Exception as e:
        current_app.logger.error(f"🔥 Unexpected error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Internal server error'
        }), 500

@auth_bp.route('/verify', methods=['POST'])
def verify_token():
    """Verify JWT token validity"""
    try:
        verify_jwt_in_request()
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'valid': False}), 401

        return jsonify({
            'valid': True,
            'user': user.to_dict(),
            'claims': claims
        }), 200

    except Exception as e:
        # Fallback to body token verification
        data = request.get_json()
        if not data or 'token' not in data:
            return jsonify({'valid': False}), 401
            
        try:
            decoded = decode_token(data['token'])
            user = User.query.get(decoded['sub'])
            if not user:
                return jsonify({'valid': False}), 401
                
            return jsonify({
                'valid': True,
                'user': user.to_dict(),
                'claims': decoded
            }), 200
        except Exception:
            return jsonify({'valid': False}), 401