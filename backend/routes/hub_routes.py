from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta, timezone
from extensions import db
from models import User, GeneralResource, Banner, LiveClass, Forum, ForumReply , Competition , CompetitionParticipant , TutoringSession , TutoringEnrollment 
from sqlalchemy import or_, and_, desc

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

# ========================================
# FORUM ROUTES
# ========================================

@hub_bp.route('/forums', methods=['GET'])
@jwt_required()
def get_forums():
    """Get all forum threads with replies"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        subject_filter = request.args.get('subject', '')
        
        query = Forum.query.filter_by(is_active=True)
        
        if subject_filter:
            query = query.filter(Forum.subject.ilike(f'%{subject_filter}%'))
        
        forums = query.order_by(desc(Forum.updated_at)).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify([forum.to_dict() for forum in forums.items]), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching forums: {str(e)}")
        return jsonify({'error': 'Failed to fetch forums'}), 500

@hub_bp.route('/forums', methods=['POST'])
@jwt_required()
def create_forum():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Get current user properly
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Validate required fields
        required_fields = ['title', 'content', 'subject']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400

        # Create forum post
        new_post = Forum(
            title=data['title'].strip(),
            content=data['content'].strip(),
            subject=data['subject'].strip(),
            author_id=user.id,
            school_id=user.school_id
        )
        
        db.session.add(new_post)
        db.session.commit()
        
        return jsonify(new_post.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating forum: {str(e)}")
        return jsonify({'error': 'Failed to create forum post'}), 500
    
@hub_bp.route('/forums/<int:forum_id>/replies', methods=['POST'])
@jwt_required()
def create_forum_reply(forum_id):           # ← accept the parameter
    """
    Add a reply to a forum thread. Any authenticated user can post.
    Returns the new reply JSON.
    """
    try:
        user_id = int(get_jwt_identity())   # already an int/str, not a dict
        user    = User.query.get_or_404(user_id)
        thread  = Forum.query.get_or_404(forum_id)

        data    = request.get_json(force=True)
        content = (data.get('content') or '').strip()
        if not content:
            return jsonify({'error': 'Content is required'}), 400

        reply = ForumReply(
            content         = content,
            author_id       = user.id,
            forum_id        = thread.id,
            school_id       = user.school_id,
            parent_reply_id = data.get('parent_reply_id')    # optional nested reply
        )
        db.session.add(reply)

        # bump counter & touch updated_at
        thread.replies_count = (thread.replies_count or 0) + 1
        thread.updated_at    = datetime.utcnow()

        db.session.commit()
        return jsonify(reply.to_dict()), 201

    except Exception as e:
        current_app.logger.error(f"Error creating reply: {e}")
        db.session.rollback()
        return jsonify({'error': 'Failed to create reply'}), 500

# ========================================
# COMPETITION ROUTES
# ========================================

@hub_bp.route('/competitions', methods=['GET'])
@jwt_required()
def get_competitions():
    """Get all competitions"""
    try:
        status_filter = request.args.get('status', '')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        query = Competition.query
        
        if status_filter:
            query = query.filter_by(status=status_filter)
        
        # Update expired competitions
        expired_competitions = query.filter(
            and_(Competition.deadline < datetime.utcnow(), Competition.status == 'active')
        ).all()
        
        for comp in expired_competitions:
            comp.status = 'completed'
        
        if expired_competitions:
            db.session.commit()
        
        competitions = query.order_by(desc(Competition.created_at)).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify([comp.to_dict() for comp in competitions.items]), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching competitions: {str(e)}")
        return jsonify({'error': 'Failed to fetch competitions'}), 500

@hub_bp.route('/competitions', methods=['POST'])
@jwt_required()
def create_competition():
    try:
        current_user = get_jwt_identity()
        user = User.query.get(int(current_user))  # FIXED HERE
        
        data = request.get_json()

        if not isinstance(data, dict):
            return jsonify({'error': 'Invalid JSON data'}), 400
        
        required_fields = ['title', 'description', 'deadline']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400

        try:
            deadline = datetime.fromisoformat(data['deadline'].replace('Z', '+00:00'))
        except ValueError:
            return jsonify({'error': 'Invalid deadline format'}), 400

        if deadline <= datetime.utcnow():
            return jsonify({'error': 'Deadline must be in the future'}), 400

        competition = Competition(
            title=data['title'].strip(),
            description=data['description'].strip(),
            host_school_id=user.school_id,
            created_by_id=user.id,
            deadline=deadline,
            max_participants=data.get('max_participants'),
            prize_description=data.get('prize_description', '').strip() if data.get('prize_description') else None,
            rules=data.get('rules', '').strip() if data.get('rules') else None
        )

        db.session.add(competition)
        db.session.commit()

        return jsonify(competition.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating competition: {str(e)}")
        return jsonify({'error': 'Failed to create competition'}), 500

@hub_bp.route('/competitions/<int:competition_id>/join', methods=['POST'])
@jwt_required()
def join_competition(competition_id):          # ← accept it here
    try:
        user_id = int(get_jwt_identity())
        user    = User.query.get_or_404(user_id)

        competition = Competition.query.get_or_404(competition_id)

        # 1. status / deadline checks
        if competition.status != 'active':
            return jsonify({'error': 'Competition is not active'}), 400
        if competition.deadline <= datetime.utcnow():
            return jsonify({'error': 'Competition deadline has passed'}), 400

        # 2. duplicate / capacity checks
        if CompetitionParticipant.query.filter_by(
                competition_id=competition.id,
                school_id=user.school_id).first():
            return jsonify({'error': 'Your school is already participating'}), 400
        if competition.max_participants and \
           len(competition.participants) >= competition.max_participants:
            return jsonify({'error': 'Competition is full'}), 400

        # 3. create participation
        participant = CompetitionParticipant(
            competition_id = competition.id,
            school_id      = user.school_id,
            teacher_id     = user.id
        )
        db.session.add(participant)
        db.session.commit()

        return jsonify(participant.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error joining competition: {e}")
        return jsonify({'error': 'Failed to join competition'}), 500


# ────────────────────────────────────────────────
#  POST /competitions/<competition_id>/submit
# ────────────────────────────────────────────────
@hub_bp.route('/competitions/<int:competition_id>/submit', methods=['POST'])
@jwt_required()
def submit_competition_entry(competition_id):   # ← parameter here too
    try:
        user_id = int(get_jwt_identity())
        user    = User.query.get_or_404(user_id)

        data = request.get_json(force=True)

        participant = CompetitionParticipant.query.filter_by(
            competition_id = competition_id,
            school_id      = user.school_id
        ).first_or_404()

        participant.submission_url  = data.get('submission_url')
        participant.submission_text = data.get('submission_text')
        participant.submitted_at    = datetime.utcnow()

        db.session.commit()
        return jsonify(participant.to_dict()), 200

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error submitting entry: {e}")
        return jsonify({'error': 'Failed to submit entry'}), 500
    
# ========================================
# TUTORING ROUTES
# ========================================

@hub_bp.route('/tutoring-sessions', methods=['GET'])
@jwt_required()
def get_tutoring_sessions():
    """Get all tutoring sessions"""
    try:
        subject_filter = request.args.get('subject', '')
        status_filter = request.args.get('status', 'scheduled')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        query = TutoringSession.query.filter(
            TutoringSession.time_slot > datetime.utcnow()
        )
        
        if subject_filter:
            query = query.filter(TutoringSession.subject.ilike(f'%{subject_filter}%'))
        
        if status_filter:
            query = query.filter_by(status=status_filter)
        
        sessions = query.order_by(TutoringSession.time_slot.asc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify([session.to_dict() for session in sessions.items]), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching tutoring sessions: {str(e)}")
        return jsonify({'error': 'Failed to fetch tutoring sessions'}), 500

@hub_bp.route("/tutoring-sessions", methods=["POST"])
@jwt_required()
def create_tutoring_session():
    """Create a new tutoring session."""
    try:
        user = User.query.get(int(get_jwt_identity()))
        data = request.get_json()

        # ---------- validate ----------
        if not data:
            return jsonify(error="No JSON body provided"), 400

        missing = [f for f in ("subject", "description", "time_slot")
                   if not data.get(f)]
        if missing:
            return jsonify(error="Missing fields", fields=missing), 400

        # parse datetime (allow naive or Z)
        ts_raw = data["time_slot"].strip()
        if ts_raw[-1] != "Z" and "+" not in ts_raw:
            ts_raw += "Z"
        try:
            time_slot = datetime.fromisoformat(ts_raw.replace("Z", "+00:00"))
        except ValueError:
            return jsonify(error="Invalid time_slot format"), 400

        if time_slot <= datetime.now(timezone.utc):
           return jsonify({'error': 'Time slot must be in the future'}), 400
        # ---------- create ----------
        session = TutoringSession(
            subject=data["subject"].strip(),
            description=data["description"].strip(),
            tutor_id=user.id,
            school_id=user.school_id,
            time_slot=time_slot,
            duration_minutes=data.get("duration_minutes", 60),
            max_students=data.get("max_students", 20),
            meeting_link=(data.get("meeting_link") or "").strip() or None,
            meeting_password=(data.get("meeting_password") or "").strip() or None,
            is_cross_school=data.get("is_cross_school", True),
        )
        db.session.add(session)
        db.session.commit()
        return jsonify(session.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error("Error creating tutoring session: %s", e, exc_info=True)
        return jsonify(error="Failed to create tutoring session"), 500

@hub_bp.route('/tutoring-sessions/<int:session_id>/join', methods=['POST'])
@jwt_required()
def join_tutoring_session():
    """Join a tutoring session"""
    try:
        current_user = get_jwt_identity()
        user = User.query.get(int(current_user))
        
        session_id = request.view_args['session_id']
        session = TutoringSession.query.get_or_404(session_id)
        
        # Check if session is still available
        if session.status != 'scheduled':
            return jsonify({'error': 'Session is not available for enrollment'}), 400
        
        if session.time_slot <= datetime.utcnow():
            return jsonify({'error': 'Session has already started or ended'}), 400
        
        if session.available_slots <= 0:
            return jsonify({'error': 'Session is full'}), 400
        
        # Check if user already enrolled
        existing_enrollment = TutoringEnrollment.query.filter(
            and_(
                TutoringEnrollment.session_id == session.id,
                or_(
                    TutoringEnrollment.student_id == user.id,
                    TutoringEnrollment.teacher_id == user.id
                )
            )
        ).first()
        
        if existing_enrollment:
            return jsonify({'error': 'You are already enrolled in this session'}), 400
        
        # Determine enrollment type based on user role
        enrollment_type = 'teacher' if user.role == 'teacher' else 'student'
        
        # Create enrollment
        enrollment = TutoringEnrollment(
            session_id=session.id,
            student_id=user.id if enrollment_type == 'student' else None,
            teacher_id=user.id if enrollment_type == 'teacher' else None,
            school_id=user.school_id,
            enrollment_type=enrollment_type
        )
        
        db.session.add(enrollment)
        db.session.commit()
        
        return jsonify(enrollment.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error joining session: {str(e)}")
        return jsonify({'error': 'Failed to join session'}), 500

@hub_bp.route('/tutoring-sessions/<int:session_id>/feedback', methods=['POST'])
@jwt_required()
def submit_session_feedback():
    """Submit feedback for a tutoring session"""
    try:
        current_user = get_jwt_identity()
        user = User.query.get(int(current_user))
        
        session_id = request.view_args['session_id']
        data = request.get_json()
        
        enrollment = TutoringEnrollment.query.filter(
            and_(
                TutoringEnrollment.session_id == session_id,
                or_(
                    TutoringEnrollment.student_id == user.id,
                    TutoringEnrollment.teacher_id == user.id
                )
            )
        ).first_or_404()
        
        # Update feedback
        enrollment.rating = data.get('rating')
        enrollment.feedback = data.get('feedback', '').strip() if data.get('feedback') else None
        enrollment.attended = True
        
        db.session.commit()
        
        return jsonify(enrollment.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error submitting feedback: {str(e)}")
        return jsonify({'error': 'Failed to submit feedback'}), 500
