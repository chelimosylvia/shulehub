from flask import Blueprint, jsonify

homepage_bp = Blueprint('homepage', __name__, url_prefix='/api/homepage')

@homepage_bp.route('/banners')
def get_banners():
    return jsonify([
        {"id": 1, "title": "Welcome", "description": "Join our school platform!"}
    ])

@homepage_bp.route('/resources')
def get_resources():
    return jsonify([
        {"id": 1, "title": "Math Book", "subject": "Mathematics", "file_url": "/static/resources/math-book.pdf"}
    ])

@homepage_bp.route('/live-classes')
def get_live_classes():
    return jsonify([
        {"id": 1, "title": "Algebra", "start_time": "2025-06-25T10:30:00", "meeting_link": "https://zoom.us/example"}
    ])
