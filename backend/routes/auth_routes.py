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
                    'admission_number': student.admission_number,
                    'first_name': student.first_name,
                    'last_name': student.last_name,
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
                'admission_number': student.admission_number,
                'first_name': student.first_name,
                'last_name': student.last_name,
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
            current_app.logger.error("Non-JSON request received")
            return jsonify({'error': 'Request must be JSON'}), 400

        data = request.get_json()
        current_app.logger.debug(f"Login attempt with data: {data}")

        # Input validation
        required_fields = ['school_id', 'password']
        if not all(field in data for field in required_fields):
            missing = [f for f in required_fields if f not in data]
            current_app.logger.warning(f"Missing fields: {missing}")
            return jsonify({'error': f'Missing required fields: {missing}'}), 400

        # Identifier validation
        identifier = data.get('tsc_number') or data.get('national_id')
        if not identifier:
            current_app.logger.warning("No identifier provided")
            return jsonify({'error': 'Provide either TSC number or National ID'}), 400

        # School ID validation
        try:
            school_id = int(data['school_id'])
        except (ValueError, TypeError):
            current_app.logger.warning(f"Invalid school_id: {data.get('school_id')}")
            return jsonify({'error': 'Invalid school ID format'}), 400

        # Find teacher
        teacher_query = User.query.filter_by(
            school_id=school_id,
            role='teacher'
        )

        if 'tsc_number' in data:
            teacher = teacher_query.filter(
                db.func.upper(User.tsc_number) == data['tsc_number'].upper()
            ).first()
        else:
            teacher = teacher_query.filter_by(
                national_id=data['national_id']
            ).first()

        if not teacher:
            current_app.logger.warning(
                f"Teacher not found: school_id={school_id}, "
                f"identifier={identifier}"
            )
            return jsonify({'error': 'Invalid credentials'}), 401

        # Account status check
        if not teacher.is_active:
            current_app.logger.warning(f"Inactive teacher account: {teacher.id}")
            return jsonify({'error': 'Account is inactive'}), 403

        # Password verification
        password_valid = False
        if teacher.password_hash:
            if teacher.password_hash.startswith('$2b$'):  # Bcrypt
                password_valid = check_password_hash(
                    teacher.password_hash, 
                    data['password']
                )
            else:  # Legacy fallback
                password_valid = (teacher.password_hash == data['password'])
                if password_valid:
                    # Upgrade to hashed password
                    teacher.password_hash = generate_password_hash(data['password'])
                    db.session.commit()

        if not password_valid:
            current_app.logger.warning(f"Invalid password for teacher {teacher.id}")
            return jsonify({'error': 'Invalid credentials'}), 401

        # Token generation
        access_token = create_access_token(
            identity=str(teacher.id),  # Ensure string sub claim
            additional_claims={
                'school_id': teacher.school_id,
                'role': 'teacher',
                'password_change_required': teacher.must_change_password
            }
        )

        current_app.logger.info(f"Successful login for teacher {teacher.id}")
        return jsonify({
            'access_token': access_token,
            'user': {
                'id': teacher.id,
                'first_name': teacher.first_name,
                'last_name': teacher.last_name,
                'email': teacher.email,
                'role': teacher.role,
                'school_id': teacher.school_id,
                'must_change_password': teacher.must_change_password
            }
        }), 200

    except Exception as e:
        current_app.logger.error(f"Login error: {str(e)}", exc_info=True)
        return jsonify({'error': 'Login processing failed'}), 500
        
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

@auth_bp.route('/force-change-password', methods=['POST', 'OPTIONS'])
def handle_force_change_password():
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        return jsonify({'status': 'success'}), 200
    
    # Verify JWT for POST requests
    try:
        verify_jwt_in_request()
    except Exception as e:
        current_app.logger.error(f"JWT verification failed: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Authentication required',
            'error': str(e)
        }), 401

    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data received'
            }), 400

        new_password = data.get('new_password', '').strip()
        if len(new_password) < 8:
            return jsonify({
                'status': 'error',
                'message': 'Password must be at least 8 characters'
            }), 422

        # Get user from token
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return jsonify({
                'status': 'error',
                'message': 'User not found'
            }), 404

        # Update password
        user.password_hash = generate_password_hash(new_password)
        user.must_change_password = False
        user.updated_at = datetime.utcnow()
        db.session.commit()

        # Generate new token without password change flag
        new_token = create_access_token(
            identity=str(user.id),
            additional_claims={
                'school_id': user.school_id,
                'role': user.role,
                'first_name': user.first_name,
                'last_name': user.last_name
            }
        )

        return jsonify({
            'status': 'success',
            'message': 'Password updated successfully',
            'access_token': new_token,
            'user': user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Password change error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Password change failed'
        }), 500

@auth_bp.route('/verify', methods=['POST'])
def verify_token():
    """
    Verify JWT token validity for all roles
    Returns 401 if invalid, 200 with user data if valid
    """
    try:
        # =====================================================================
        # 1. Extract and Validate Token
        # =====================================================================
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            current_app.logger.error("Missing or malformed Authorization header")
            return jsonify({
                'valid': False,
                'error': 'Missing or invalid Authorization header'
            }), 401

        token = auth_header.split(' ')[1]
        
        # =====================================================================
        # 2. Decode and Verify Token
        # =====================================================================
        try:
            decoded = decode_token(token)
            current_app.logger.debug(f"Decoded token: {decoded}")
        except Exception as e:
            current_app.logger.error(f"Token decode failed: {str(e)}")
            return jsonify({
                'valid': False,
                'error': 'Invalid token',
                'details': str(e)
            }), 401

        # =====================================================================
        # 3. Get User from Database
        # =====================================================================
        user_id = str(decoded['sub'])  # Convert to string for safety
        user = User.query.get(user_id)
        
        if not user:
            current_app.logger.error(f"User not found: ID={user_id}")
            return jsonify({
                'valid': False,
                'error': 'User not found'
            }), 401

        # =====================================================================
        # 4. Role-Specific Validation
        # =====================================================================
        if decoded.get('role') == 'teacher':
            if not user.is_active:
                current_app.logger.warning(f"Inactive teacher: ID={user_id}")
                return jsonify({
                    'valid': False,
                    'error': 'Teacher account inactive'
                }), 403

            # Update claims with current password change status
            decoded['password_change_required'] = user.must_change_password

        # =====================================================================
        # 5. Successful Verification
        # =====================================================================
        current_app.logger.info(f"Successful verification for {user.role} ID={user_id}")
        return jsonify({
            'valid': True,
            'user': {
                'id': user.id,
                'email': user.email,
                'role': user.role,
                'school_id': user.school_id,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_active': user.is_active
            },
            'claims': decoded
        }), 200

    except Exception as e:
        current_app.logger.error(f"Unexpected verification error: {str(e)}")
        return jsonify({
            'valid': False,
            'error': 'Internal server error',
            'details': str(e)
        }), 500