from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
import os

resource_bp = Blueprint('resource', __name__)

ALLOWED_EXTENSIONS = {'pdf', 'docx', 'pptx', 'mp4', 'jpg', 'png'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@resource_bp.route('/resources', methods=['POST'])
@jwt_required()
def upload_resource():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400
        
        filename = secure_filename(file.filename)
        # Save file logic here
        # e.g., file.save(os.path.join(UPLOAD_FOLDER, filename))
        
        # Extract tags like subject, grade from request.form
        subject = request.form.get('subject')
        grade_level = request.form.get('grade_level')
        
        # Save resource metadata to DB here
        
        return jsonify({'message': 'Resource uploaded successfully'}), 201
    except Exception as e:
        return jsonify({'error': 'Failed to upload resource', 'details': str(e)}), 500

@resource_bp.route('/resources/search', methods=['GET'])
@jwt_required()
def search_resources():
    try:
        # Extract search filters from query params
        subject = request.args.get('subject')
        grade = request.args.get('grade')
        keyword = request.args.get('keyword')
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 100)
        
        # Query DB with filters and paginate
        # resources = Resource.query.filter(...).paginate(page, per_page, False)
        
        # Return paginated results with metadata
        return jsonify({
            'resources': [],  # Replace with resource list serialization
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': 0,
                'pages': 0,
            }
        }), 200
    except Exception as e:
        return jsonify({'error': 'Failed to search resources', 'details': str(e)}), 500

@resource_bp.route('/resources/<int:resource_id>', methods=['PATCH'])
@jwt_required()
def update_resource(resource_id):
    try:
        data = request.get_json()
        # Find resource by id
        # Check permissions for current user
        # Update metadata and access permissions accordingly
        
        return jsonify({'message': 'Resource updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': 'Failed to update resource', 'details': str(e)}), 500

@resource_bp.route('/resources/trending', methods=['GET'])
@jwt_required()
def get_trending_resources():
    try:
        # Query most accessed/downloaded resources
        # e.g., order by access_count desc limit N
        
        return jsonify({
            'trending': []  # list of resource dicts
        }), 200
    except Exception as e:
        return jsonify({'error': 'Failed to fetch trending resources', 'details': str(e)}), 500
