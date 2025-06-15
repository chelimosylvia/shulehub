import random
import string
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, create_access_token, get_jwt_identity, decode_token, verify_jwt_in_request
from werkzeug.security import generate_password_hash, check_password_hash
from models import School, User
from extensions import db
import traceback

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

def generate_default_password(length=8):
    """Generate a default password for students and teachers"""
    # Use a mix of letters and numbers for easy typing
    characters = string.ascii_letters + string.digits
    return ''.join(random.choices(characters, k=length))

@auth_bp.route('/school-admin/login', methods=['POST'])
def school_admin_login():
    """Login using school credentials (no password)"""
    try:
        data = request.get_json()
        
        # Normalize input
        email = (data.get('email') or '').strip().lower()
        school_code = (data.get('school_code') or data.get('schoolCode') or '').strip()
        reg_number = (data.get('registration_number') or data.get('registrationNumber') or '').strip()

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

        # Generate token
        access_token = create_access_token(
            identity=str(admin_user.id),
            additional_claims={
                'school_id': school.id,
                'role': 'school_admin',
                'is_owner': school.owner_id == admin_user.id
            }
        )

        return jsonify({
            'message': 'Login successful',
            'access_token': access_token,
            'user': admin_user.to_dict(),
            'school': school.to_dict()
        }), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': 'Login failed', 'details': str(e)}), 500

@auth_bp.route('/user/login', methods=['POST'])
def user_login():
    """Login route for regular users (teachers, students) using email and password"""
    try:
        data = request.get_json()
        
        email = data.get('email', '').strip()
        password = data.get('password', '').strip()

        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400

        # Check user exists
        user = User.query.filter_by(email=email, is_active=True).first()
        if not user:
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Check if user has a password (school admins don't need passwords)
        if user.role == 'school_admin':
            return jsonify({'error': 'School admins should use the school admin login endpoint'}), 400
        
        # Verify password
        if not user.password_hash or not check_password_hash(user.password_hash, password):
            return jsonify({'error': 'Invalid email or password'}), 401

        # Create token
        access_token = create_access_token(
            identity=str(user.id), 
            additional_claims={'school_id': user.school_id}
        )

        return jsonify({
            'message': f'{user.role.capitalize()} login successful',
            'access_token': access_token,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        traceback.print_exc()
        return jsonify({'error': 'Login failed', 'details': str(e)}), 500

@auth_bp.route('/verify', methods=['POST'])
def verify_token():
    # Try header-based JWT first
    try:
        verify_jwt_in_request()  # raises if token is missing/invalid
        current_user_id = get_jwt_identity()  # This is the user ID as string
        
        # Get additional claims
        from flask_jwt_extended import get_jwt
        claims = get_jwt()
        school_id = claims.get('school_id')
        
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'valid': False}), 401

        return jsonify({
            'valid': True,
            'user': user.to_dict(),
            'school_id': school_id
        }), 200

    except Exception as e:
        print('Header token error:', e)

    # Fallback: check body
    data = request.get_json()
    if not data or 'token' not in data:
        return jsonify({'error': 'Token required'}), 422

    try:
        decoded = decode_token(data['token'])
        sub = decoded.get('sub')
        claims = decoded.get('claims', {})
        school_id = claims.get('school_id')

        user = User.query.get(sub)
        if not user:
            return jsonify({'valid': False}), 401

        return jsonify({
            'valid': True,
            'user': user.to_dict(),
            'school_id': school_id
        }), 200

    except Exception as e:
        return jsonify({'valid': False, 'error': str(e)}), 401

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    jti = get_jwt()["jti"]
    # Add to blacklist if using token invalidation
    return jsonify({'message': 'Logged out successfully'}), 200


@auth_bp.route('/users', methods=['POST'])
@jwt_required()
def create_user():
    """Create students and teachers - Only school admins can access this"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.role != 'school_admin':
            return jsonify({'error': 'Access denied. Only school admins can create users'}), 403
        
        data = request.get_json()
        
        # Required fields
        required_fields = ['email', 'first_name', 'last_name', 'role']
        for field in required_fields:
            if not data.get(field, '').strip():
                return jsonify({'error': f'{field.replace("_", " ").title()} is required'}), 400
        
        email = data['email'].strip().lower()
        first_name = data['first_name'].strip()
        last_name = data['last_name'].strip()
        role = data['role'].strip().lower()
        phone = data.get('phone', '').strip()
        
        # Validate role
        valid_roles = ['student', 'teacher']
        if role not in valid_roles:
            return jsonify({'error': 'Invalid role. Must be student or teacher'}), 400
        
        # Check if email already exists
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already exists'}), 409
        
        # Generate default password
        default_password = generate_default_password()
        
        # Create user
        new_user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            role=role,
            school_id=current_user.school_id,  # Assign to same school as admin
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        new_user.set_password(default_password)
        
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({
            'message': f'{role.title()} created successfully',
            'user': new_user.to_dict(),
            'login_credentials': {
                'email': email,
                'password': default_password,
                'instructions': f'User can login at /auth/login with these credentials. Please share the password securely.'
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        traceback.print_exc()
        return jsonify({'error': 'User creation failed', 'details': str(e)}), 500

@auth_bp.route('/users', methods=['GET'])
@jwt_required()
def get_school_users():
    """Get all users in the school - Only school admins can access this"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.role != 'school_admin':
            return jsonify({'error': 'Access denied. Only school admins can view users'}), 403
        
        # Get all users in the same school
        users = User.query.filter_by(
            school_id=current_user.school_id,
            is_active=True
        ).filter(User.role.in_(['student', 'teacher'])).all()
        
        return jsonify({
            'users': [user.to_dict() for user in users],
            'total_count': len(users)
        }), 200
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': 'Failed to retrieve users', 'details': str(e)}), 500

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Change user password"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        old_password = data.get('old_password', '').strip()
        new_password = data.get('new_password', '').strip()
        
        if not old_password or not new_password:
            return jsonify({'error': 'Old password and new password are required'}), 400
        
        # Verify old password
        if not current_user.check_password(old_password):
            return jsonify({'error': 'Invalid old password'}), 401
        
        # Validate new password
        if len(new_password) < 6:
            return jsonify({'error': 'New password must be at least 6 characters long'}), 400
        
        # Update password
        current_user.set_password(new_password)
        current_user.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({'message': 'Password changed successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        traceback.print_exc()
        return jsonify({'error': 'Password change failed', 'details': str(e)}), 500

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_user_profile():
    """Get current user's profile"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get school info if user belongs to a school
        school_info = None
        if current_user.school_id:
            school = School.query.get(current_user.school_id)
            if school:
                school_info = school.to_dict()
        
        return jsonify({
            'user': current_user.to_dict(),
            'school': school_info
        }), 200
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': 'Failed to retrieve profile', 'details': str(e)}), 500