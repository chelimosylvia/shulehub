import random
import string
from datetime import datetime
from flask import Blueprint, request, jsonify
from models import School, User
from flask_jwt_extended import jwt_required
from extensions import db
import traceback

def generate_school_code():
    """Generate a unique 8-character school code"""
    while True:
        # Generate 2 letters + 6 digits format (e.g., AB123456)
        letters = ''.join(random.choices(string.ascii_uppercase, k=2))
        numbers = ''.join(random.choices(string.digits, k=6))
        code = letters + numbers
        print("Generated School Code:", code)
        
        # Check if code already exists
        if not School.query.filter_by(school_code=code).first():
            return code

def generate_registration_number():
    """Generate a unique registration number"""
    while True:
        # Format: REG-YYYYMMDD-XXXX (e.g., REG-20250612-1234)
        date_part = datetime.utcnow().strftime('%Y%m%d')
        random_part = ''.join(random.choices(string.digits, k=4))
        reg_number = f"REG-{date_part}-{random_part}"
        
        # Check if registration number already exists
        if not School.query.filter_by(registration_number=reg_number).first():
            return reg_number

def is_valid_county(county):
    """Validate if the county is a valid Kenyan county"""
    kenyan_counties = [
        'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu',
        'Garissa', 'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho',
        'Kiambu', 'Kilifi', 'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui',
        'Kwale', 'Laikipia', 'Lamu', 'Machakos', 'Makueni', 'Mandera',
        'Marsabit', 'Meru', 'Migori', 'Mombasa', 'Murang\'a', 'Nairobi',
        'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua', 'Nyeri',
        'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River', 'Tharaka-Nithi',
        'Trans Nzoia', 'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot'
    ]
    return county in kenyan_counties

school_bp = Blueprint('schools', __name__, url_prefix='/api/schools')
@school_bp.route('', methods=['POST'])
def create_school():
    """Register a new school - No authentication required"""
    try:
        data = request.get_json()

        # Required fields
        required_fields = ['name', 'email', 'phone', 'address', 'county', 'school_type']
        for field in required_fields:
            if not data.get(field, '').strip():
                return jsonify({'error': f'{field.capitalize()} is required'}), 400

        name = data['name'].strip()
        email = data['email'].strip().lower()
        phone = data['phone'].strip()
        address = data['address'].strip()
        county = data['county'].strip()
        school_type = data['school_type'].strip().lower()

        # Validate county
        if not is_valid_county(county):
            return jsonify({'error': 'Invalid county. Please select a valid Kenyan county'}), 400

        # Validate school_type
        valid_school_types = ['public', 'private', 'international']
        if school_type not in valid_school_types:
            return jsonify({'error': 'Invalid school type. Must be public, private, or international'}), 400

        # Uniqueness checks
        if School.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already in use by another school'}), 409

        if School.query.filter_by(name=name, county=county, is_active=True).first():
            return jsonify({'error': 'A school with this name already exists in this county'}), 409

        # Generate identifiers
        school_code = generate_school_code()
        registration_number = generate_registration_number()

        # Optional fields
        description = data.get('description', '').strip()
        website = data.get('website', '').strip()
        established_year = data.get('established_year')

        if established_year:
            try:
                established_year = int(established_year)
                current_year = datetime.utcnow().year
                if established_year < 1800 or established_year > current_year:
                    return jsonify({'error': 'Invalid established year'}), 400
            except (ValueError, TypeError):
                return jsonify({'error': 'Established year must be a valid number'}), 400
        else:
            established_year = None

        # Leave owner_id as None for self-registered schools
        # Schools can claim ownership later through proper authentication

        # Create school object
        new_school = School(
            owner_id=None,  # Allow NULL for self-registered schools
            name=name,
            email=email,
            phone=phone,
            address=address,
            county=county,
            school_type=school_type,
            description=description,
            website=website,
            established_year=established_year,
            school_code=school_code,
            registration_number=registration_number,
            level='high school',
            is_verified=False,
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        print("Creating new school:", new_school)

        db.session.add(new_school)
        db.session.commit()

        return jsonify({
            'message': 'School registered successfully!',
            'school': new_school.to_dict(),
            'login_credentials': {
                'email': email,
                'school_code': school_code,
                'registration_number': registration_number,
                'instructions': 'Use these credentials to login as School Administrator at /auth/login with role=school_admin'
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        traceback.print_exc()
        return jsonify({'error': 'School registration failed', 'details': str(e)}), 500


def get_or_create_system_owner():
    """Get or create a system user to own self-registered schools"""
    from models import User  # Import your User model
    
    system_email = "system@shulehub.com"
    system_owner = User.query.filter_by(email=system_email).first()
    
    if not system_owner:
        system_owner = User(
            email=system_email,
            first_name="System",
            last_name="Owner",
            role="admin",  # Use admin role for system owner
            password_hash="system_generated_hash"  # Placeholder password hash
        )
        # Set a proper password hash for security
        system_owner.set_password("SystemOwner2025!")  # This will be overridden by set_password
        
        db.session.add(system_owner)
        db.session.flush()  # Get the ID without committing
    
    return system_owner


# Get all active schools with county filter
@school_bp.route('', methods=['GET'])
@jwt_required()
def get_schools():
    try:
        county_filter = request.args.get('county')
        
        query = School.query.filter_by(is_active=True)
        
        if county_filter:
            query = query.filter_by(county=county_filter)
            
        schools = query.all()
        return jsonify({'schools': [school.to_dict() for school in schools]}), 200
    except Exception as e:
        return jsonify({'error': 'Failed to fetch schools', 'details': str(e)}), 500

# Get school by code
@school_bp.route('/code/<string:school_code>', methods=['GET'])
@jwt_required()
def get_school_by_code(school_code):
    try:
        school = School.query.filter_by(school_code=school_code, is_active=True).first()
        if not school:
            return jsonify({'error': 'School not found'}), 404
            
        return jsonify({'school': school.to_dict()}), 200
    except Exception as e:
        return jsonify({'error': 'Failed to fetch school', 'details': str(e)}), 500

# Update school details (only school admin or system admin)
@school_bp.route('/<int:school_id>', methods=['PUT'])
@jwt_required()
def update_school(school_id):
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        school = School.query.filter_by(id=school_id, is_active=True).first()
        if not school:
            return jsonify({'error': 'School not found'}), 404

        # Check permissions: school owner, school admin, or system admin
        if not (school.owner_id == user_id or 
                (user.role == 'school_admin' and user.school_id == school_id) or 
                user.role == 'admin'):
            return jsonify({'error': 'Insufficient permissions'}), 403

        # Update fields if provided
        if 'name' in data:
            name = data['name'].strip()
            # Check for duplicate names in the same county
            existing = School.query.filter_by(
                name=name, 
                county=school.county, 
                is_active=True
            ).filter(School.id != school_id).first()
            if existing:
                return jsonify({'error': 'A school with this name already exists in this county'}), 409
            school.name = name
            
        if 'email' in data:
            school.email = data['email'].strip()
        if 'phone' in data:
            school.phone = data['phone'].strip()
        if 'address' in data:
            school.address = data['address'].strip()
        if 'county' in data:
            county = data['county'].strip()
            if not is_valid_county(county):
                return jsonify({'error': 'Invalid county'}), 400
            school.county = county

        # Level remains fixed to 'high school'
        school.level = 'high school'
        school.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({'message': 'School updated successfully', 'school': school.to_dict()}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update school', 'details': str(e)}), 500

# Add users to school (only school admin or system admin)
@school_bp.route('/<int:school_id>/users', methods=['POST'])
@jwt_required()
def add_school_user(school_id):
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        current_user = User.query.get(user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404

        school = School.query.filter_by(id=school_id, is_active=True).first()
        if not school:
            return jsonify({'error': 'School not found'}), 404

        # Check permissions
        if not ((current_user.role == 'school_admin' and current_user.school_id == school_id) or 
                current_user.role == 'admin'):
            return jsonify({'error': 'Insufficient permissions. Only school admins can add users'}), 403

        # Validate required fields
        required_fields = ['email', 'first_name', 'last_name', 'role']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'{field} is required'}), 400

        # Validate role
        valid_roles = ['student', 'teacher']
        if data['role'] not in valid_roles:
            return jsonify({'error': 'Only students and teachers can be added to schools'}), 400

        # Check if email already exists
        if User.query.filter_by(email=data['email'].lower().strip()).first():
            return jsonify({'error': 'Email already registered'}), 409

        # Generate default password
        default_password = generate_default_password()

        # Create new user
        new_user = User(
            email=data['email'].lower().strip(),
            first_name=data['first_name'].strip(),
            last_name=data['last_name'].strip(),
            phone=data.get('phone', '').strip(),
            role=data['role'],
            school_id=school_id,
            force_password_change=True,  # Force password change on first login
            is_active=True
        )
        new_user.set_password(default_password)

        db.session.add(new_user)
        db.session.commit()

        return jsonify({
            'message': 'User added successfully',
            'user': new_user.to_dict(),
            'default_password': default_password,
            'note': 'User must change password on first login'
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to add user', 'details': str(e)}), 500

# Get all users in a school
@school_bp.route('/<int:school_id>/users', methods=['GET'])
@jwt_required()
def get_school_users(school_id):
    try:
        user_id = get_jwt_identity()
        current_user = User.query.get(user_id)

        if not current_user:
            return jsonify({'error': 'User not found'}), 404

        school = School.query.filter_by(id=school_id, is_active=True).first()
        if not school:
            return jsonify({'error': 'School not found'}), 404

        # Permission check
        if not ((current_user.role == 'school_admin' and current_user.school_id == school_id) or
                current_user.role == 'admin'):
            return jsonify({'error': 'Insufficient permissions to view users in this school'}), 403

        users = User.query.filter_by(school_id=school_id, is_active=True).all()
        return jsonify({'users': [user.to_dict() for user in users]}), 200

    except Exception as e:
        return jsonify({'error': 'Failed to fetch users', 'details': str(e)}), 500

# Soft delete a school (only system admin)
@school_bp.route('/<int:school_id>', methods=['DELETE'])
@jwt_required()
def delete_school(school_id):
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        school = School.query.filter_by(id=school_id, is_active=True).first()
        if not school:
            return jsonify({'error': 'School not found'}), 404

        # Only system admin can delete schools
        if user.role != 'admin':
            return jsonify({'error': 'Only system administrators can delete schools'}), 403

        school.is_active = False
        school.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({'message': 'School deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete school', 'details': str(e)}), 500

# Add a class to a school
@school_bp.route('/<int:school_id>/classes', methods=['POST'])
@jwt_required()
def add_school_class(school_id):
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        school = School.query.filter_by(id=school_id, is_active=True).first()
        if not school:
            return jsonify({'error': 'School not found'}), 404

        # Check permissions
        if not ((user.role == 'school_admin' and user.school_id == school_id) or 
                user.role == 'admin'):
            return jsonify({'error': 'Insufficient permissions'}), 403

        class_level = data.get('class_level', '').strip().lower()
        section = data.get('section', '').strip()
        capacity = data.get('capacity', 0)
        description = data.get('description', '').strip()

        if not is_valid_class_level(class_level):
            return jsonify({'error': f'class_level must be one of the allowed high school levels'}), 400

        if not section:
            return jsonify({'error': 'Section is required'}), 400

        # Check for duplicate class in the same school
        existing_class = SchoolClass.query.filter_by(
            school_id=school_id,
            class_level=class_level,
            section=section,
            is_active=True
        ).first()
        
        if existing_class:
            return jsonify({'error': 'This class and section combination already exists'}), 409

        new_class = SchoolClass(
            school_id=school_id,
            class_level=class_level,
            section=section,
            capacity=capacity,
            description=description,
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.session.add(new_class)
        db.session.commit()

        return jsonify({'message': 'Class added successfully', 'class': new_class.to_dict()}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to add class', 'details': str(e)}), 500

# Get all active classes for a school
@school_bp.route('/<int:school_id>/classes', methods=['GET'])
@jwt_required()
def get_school_classes(school_id):
    try:
        school = School.query.filter_by(id=school_id, is_active=True).first()
        if not school:
            return jsonify({'error': 'School not found'}), 404

        classes = SchoolClass.query.filter_by(school_id=school_id, is_active=True).all()
        return jsonify({'classes': [cls.to_dict() for cls in classes]}), 200

    except Exception as e:
        return jsonify({'error': 'Failed to fetch classes', 'details': str(e)}), 500

# Update a specific class
@school_bp.route('/<int:school_id>/classes/<int:class_id>', methods=['PUT'])
@jwt_required()
def update_school_class(school_id, class_id):
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        school = School.query.filter_by(id=school_id, is_active=True).first()
        if not school:
            return jsonify({'error': 'School not found'}), 404

        school_class = SchoolClass.query.filter_by(id=class_id, school_id=school_id, is_active=True).first()
        if not school_class:
            return jsonify({'error': 'Class not found'}), 404

        # Check permissions
        if not ((user.role == 'school_admin' and user.school_id == school_id) or 
                user.role == 'admin'):
            return jsonify({'error': 'Insufficient permissions'}), 403

        if 'class_level' in data:
            class_level = data['class_level'].strip().lower()
            if not is_valid_class_level(class_level):
                return jsonify({'error': 'Invalid class_level for high school'}), 400
            school_class.class_level = class_level

        if 'section' in data:
            school_class.section = data['section'].strip()

        if 'capacity' in data:
            school_class.capacity = data['capacity']

        if 'description' in data:
            school_class.description = data['description'].strip()

        school_class.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({'message': 'Class updated successfully', 'class': school_class.to_dict()}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update class', 'details': str(e)}), 500

# Delete (soft delete) a class
@school_bp.route('/<int:school_id>/classes/<int:class_id>', methods=['DELETE'])
@jwt_required()
def delete_school_class(school_id, class_id):
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        school = School.query.filter_by(id=school_id, is_active=True).first()
        if not school:
            return jsonify({'error': 'School not found'}), 404

        school_class = SchoolClass.query.filter_by(id=class_id, school_id=school_id, is_active=True).first()
        if not school_class:
            return jsonify({'error': 'Class not found'}), 404

        # Check permissions
        if not ((user.role == 'school_admin' and user.school_id == school_id) or 
                user.role == 'admin'):
            return jsonify({'error': 'Insufficient permissions'}), 403

        school_class.is_active = False
        school_class.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({'message': 'Class deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete class', 'details': str(e)}), 500