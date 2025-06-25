from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from extensions import db
from models import User, GeneralResource, Banner, LiveClass

hub_bp = Blueprint("hub", __name__, url_prefix="/api/hub")

# -----------------------------------------------------------
# Helpers
# -----------------------------------------------------------

def current_user() -> User | None:
    uid = get_jwt_identity()
    return User.query.get(uid)

def is_teacher() -> bool:
    u = current_user()
    return bool(u and u.role == "teacher")

def serialize_resource(r: GeneralResource) -> dict:
    uploader = r.uploader
    return {
        "id": r.id,
        "title": r.title,
        "description": r.description,
        "file_url": r.file_url,
        "thumbnail_url": r.thumbnail_url,
        "resource_type": r.resource_type,
        "subject": r.subject,
        "year": r.year,
        "downloads": r.downloads,
        "uploaded_by": f"{uploader.first_name} {uploader.last_name}" if uploader else "Unknown",
        "school": uploader.school.name if uploader and uploader.school else "Unknown",
        "created_at": r.created_at.isoformat(),
    }

def serialize_class(c: LiveClass) -> dict:
    t = c.teacher
    return {
        "id": c.id,
        "title": c.title,
        "description": c.description,
        "subject": c.subject,
        "start_time": c.start_time.isoformat(),
        "end_time": c.end_time.isoformat(),
        "meeting_link": c.meeting_link,
        "max_participants": c.max_participants,
        "registered": c.registered_count,
        "teacher": f"{t.first_name} {t.last_name}" if t else "Unknown",
        "school": t.school.name if t and t.school else "Unknown",
    }

# -----------------------------------------------------------
# Routes
# -----------------------------------------------------------

@hub_bp.route("/banners", methods=["GET"])
@jwt_required()
def get_banners():
    banners = Banner.query.filter_by(is_active=True).all()
    return jsonify([{
        "id": b.id,
        "title": b.title,
        "description": b.description,
        "image_url": b.image_url,
        "banner_type": b.banner_type,
    } for b in banners]), 200

@hub_bp.route('/resources', methods=['GET', 'POST'])
@jwt_required()
def handle_resources():
    if request.method == 'POST':
        data = request.get_json()
        if not all([data.get('title'), data.get('file_url'), data.get('subject'), data.get('resource_type')]):
            return jsonify({'error': 'Missing required fields'}), 400

        resource = GeneralResource(
            title=data['title'],
            file_url=data['file_url'],
            subject=data['subject'],
            resource_type=data['resource_type'],
            uploaded_by=get_jwt_identity()
        )
        db.session.add(resource)
        db.session.commit()
        return jsonify({'message': 'Resource uploaded successfully'}), 201

    resources = GeneralResource.query.all()
    return jsonify([serialize_resource(r) for r in resources]), 200

@hub_bp.route("/live-classes", methods=["GET"])
@jwt_required()
def list_live_classes():
    classes = LiveClass.query.order_by(LiveClass.start_time.desc()).all()
    return jsonify([serialize_class(c) for c in classes]), 200

@hub_bp.route("/live-classes", methods=["POST"])
@jwt_required()
def schedule_class():
    if not is_teacher():
        return jsonify({"error": "Only teachers can schedule classes"}), 403

    data = request.get_json(force=True)
    missing = [f for f in ["title", "subject", "start_time", "meeting_link"] if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 422

    start_dt = datetime.fromisoformat(data["start_time"])
    end_dt = datetime.fromisoformat(data.get("end_time")) if data.get("end_time") else start_dt.replace(hour=start_dt.hour + 1)

    new_cls = LiveClass(
        title=data["title"].strip(),
        description=data.get("description"),
        subject=data["subject"],
        start_time=start_dt,
        end_time=end_dt,
        meeting_link=data["meeting_link"].strip(),
        max_participants=data.get("max_participants"),
        teacher_id=current_user().id,
    )
    db.session.add(new_cls)
    db.session.commit()
    return jsonify({"message": "Class scheduled", "class": serialize_class(new_cls)}), 201

# Stubs
@hub_bp.route("/forums")
@jwt_required()
def forums_stub():
    return jsonify([]), 200

@hub_bp.route("/tutoring")
@jwt_required()
def tutoring_stub():
    return jsonify([]), 200

@hub_bp.route("/competitions")
@jwt_required()
def competitions_stub():
    return jsonify([]), 200