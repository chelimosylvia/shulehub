from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, date
from extensions import db
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID
import uuid

teacher_subject = db.Table('teacher_subject',
    db.Column('teacher_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
    db.Column('subject_id', db.Integer, db.ForeignKey('subjects.id'), primary_key=True),
    db.Column('created_at', db.DateTime, default=datetime.utcnow)
)

# ------------------ USER ------------------

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=True, index=True)
    password_hash = db.Column(db.String(255), nullable=True)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    role = db.Column(db.Enum('student', 'teacher', 'school_admin', name='user_roles'), nullable=False)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    dashboard_background = db.Column(db.String(100), default=None)
    dashboard_font_color = db.Column(db.String(100), default=None)
    parent_phone = db.Column(db.String(20), nullable=True)

    # Student/Teacher specific fields
    admission_number = db.Column(db.String(50), unique=True, nullable=True)  # For students
    tsc_number = db.Column(db.String(50), unique=True, nullable=True)
    national_id = db.Column(db.String(50), unique=True, nullable=True)  # National ID (nullable)       # For teachers
    grade_level = db.Column(db.Integer, nullable=True)                      # For students
    must_change_password = db.Column(db.Boolean, default=False)
    
    # Relationships
    schools = db.relationship('School', backref='owner', lazy=True, foreign_keys='School.owner_id')
    school = db.relationship('School', foreign_keys=[school_id], backref='staff')
    enrollments = db.relationship('Enrollment', backref='user', lazy=True)
    classes_teaching = db.relationship('SchoolClass', backref='class_teacher', lazy=True, foreign_keys='SchoolClass.teacher_id')
    grade_entries = db.relationship('GradeEntry', backref='student', lazy=True, foreign_keys='GradeEntry.student_id')
    notifications = db.relationship('Notification', backref='user', lazy=True)
    dashboard_preferences = db.relationship('UserDashboardPreferences', backref='user', uselist=False, cascade='all, delete-orphan')
    # Removed the duplicate activities relationship since it's defined in Activity model
    subjects = db.relationship('Subject', secondary=teacher_subject, back_populates='teachers', lazy='dynamic')

    __table_args__ = (
        db.CheckConstraint(
            "(role != 'teacher') OR (tsc_number IS NOT NULL OR national_id IS NOT NULL)",
            name='teacher_requires_id'
        ),
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'phone': self.phone,
            'role': self.role,
            'school_id': self.school_id,
            'admission_number': self.admission_number,
            'tsc_number': self.tsc_number,
            'national_id': self.national_id,
            'grade_level': self.grade_level,
            'subjects': [subject.to_dict() for subject in self.subjects] if self.role == 'teacher' else None,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'must_change_password': self.must_change_password
        }
# ------------------ SCHOOL ------------------

class School(db.Model):
    __tablename__ = 'schools'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    address = db.Column(db.String(300), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(120), nullable=False, unique=True)
    website = db.Column(db.String(200))
    established_year = db.Column(db.Integer)
    school_type = db.Column(db.Enum('public', 'private', 'international', name='school_types'), nullable=False)
    county = db.Column(db.String(100), nullable=False)
    registration_number = db.Column(db.String(50), unique=True, nullable=False)
    school_code = db.Column(db.String(8), unique=True, nullable=False)
    is_verified = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)    
    level = db.Column(db.String(100), default='high school')  # default matches your route
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    branding_background = db.Column(db.String(100), default="#ffffff")
    branding_font_color = db.Column(db.String(100), default="#000000")

    # Relationships
    enrollments = db.relationship('Enrollment', backref='school', lazy=True, cascade='all, delete-orphan')
    classes = db.relationship('SchoolClass', backref='school', lazy=True, cascade='all, delete-orphan')
    resources = db.relationship('Resource', backref='school', lazy=True, cascade='all, delete-orphan')
    sessions = db.relationship('ClassroomSession', backref='school', lazy=True, cascade='all, delete-orphan')
    dashboard_settings = db.relationship('SchoolDashboardSettings', backref='school', uselist=False, cascade='all, delete-orphan')
    announcements = db.relationship('SchoolAnnouncement', backref='school', lazy=True)
    subjects = db.relationship('Subject', backref='school', lazy='dynamic',cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'address': self.address,
            'phone': self.phone,
            'email': self.email,
            'website': self.website,
            'established_year': self.established_year,
            'school_type': self.school_type,
            'county': self.county,
            'registration_number': self.registration_number,
            'school_code': self.school_code,
            'is_verified': self.is_verified,
            'is_active': self.is_active,
            'owner_id': self.owner_id,
            'level': self.level,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

# ------------------ SCHOOL CLASS ------------------

class SchoolClass(db.Model):
    __tablename__ = 'school_classes'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    level = db.Column(db.String(50), nullable=False)
    stream = db.Column(db.String(10))
    capacity = db.Column(db.Integer, default=40)
    current_enrollment = db.Column(db.Integer, default=0)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    logo_url = db.Column(db.String(255))
    primary_color = db.Column(db.String(7), default='#3f51b5')  # Hex color
    secondary_color = db.Column(db.String(7), default='#ff4081')
    enabled_modules = db.Column(db.JSON, default=['attendance', 'grades', 'calendar'])
    dashboard_config = db.Column(db.JSON)  

    enrollments = db.relationship('Enrollment', backref='school_class', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'level': self.level,
            'stream': self.stream,
            'capacity': self.capacity,
            'current_enrollment': self.current_enrollment,
            'school_id': self.school_id,
            'teacher_id': self.teacher_id,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

# ------------------ ENROLLMENT ------------------

class Enrollment(db.Model):
    __tablename__ = 'enrollments'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=False)
    class_id = db.Column(db.Integer, db.ForeignKey('school_classes.id'))
    admission_number = db.Column(db.String(50), unique=True)
    enrollment_date = db.Column(db.Date, default=date.today)
    status = db.Column(db.Enum('active', 'inactive', 'graduated', 'transferred', name='enrollment_status'), default='active')
    academic_year = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint('user_id', 'school_id', 'academic_year', name='unique_user_school_year'),)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'school_id': self.school_id,
            'class_id': self.class_id,
            'admission_number': self.admission_number,
            'enrollment_date': self.enrollment_date.isoformat() if self.enrollment_date else None,
            'status': self.status,
            'academic_year': self.academic_year,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

# ------------------ RESOURCE ------------------

class Resource(db.Model):
    __tablename__ = 'resources'
    
    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    resource_type = db.Column(db.Enum('notes', 'book', 'video', 'audio', 'other', name='resource_types'))
    url = db.Column(db.String(500))
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

# ------------------ CLASSROOM SESSION ------------------

class ClassroomSession(db.Model):
    __tablename__ = 'classroom_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=False)
    class_id = db.Column(db.Integer, db.ForeignKey('school_classes.id'), nullable=False)
    session_name = db.Column(db.String(200))
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    messages = db.relationship('ChatMessage', backref='session', lazy=True, cascade='all, delete-orphan')

# ------------------ CHAT MESSAGE ------------------

class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('classroom_sessions.id'), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    message = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

# ------------------ GRADE ENTRY ------------------

class GradeEntry(db.Model):
    __tablename__ = 'grade_entries'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    class_id = db.Column(db.Integer, db.ForeignKey('school_classes.id'), nullable=False)
    subject = db.Column(db.String(100), nullable=False)
    grade = db.Column(db.String(10), nullable=False)
    comments = db.Column(db.Text)
    recorded_at = db.Column(db.DateTime, default=datetime.utcnow)

# ------------------ NOTIFICATION ------------------

class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    read = db.Column(db.Boolean, default=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
# ------------------ ATTENDANCE ------------------

class Attendance(db.Model):
    __tablename__ = 'attendance_records'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    class_id = db.Column(db.Integer, db.ForeignKey('school_classes.id'), nullable=False)
    date = db.Column(db.Date, default=date.today, nullable=False)
    status = db.Column(db.Enum('present', 'absent', 'late', 'excused', name='attendance_status'), default='present')
    remarks = db.Column(db.String(255))
    recorded_by = db.Column(db.Integer, db.ForeignKey('users.id'))  # usually the teacher
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=False)

    student = db.relationship('User', foreign_keys=[student_id])
    teacher = db.relationship('User', foreign_keys=[recorded_by])
    school = db.relationship('School', backref='attendance_records')
# ------------------ ASSESSMENT ------------------

class Assessment(db.Model):
    __tablename__ = 'assessments'

    id = db.Column(db.Integer, primary_key=True)
    class_id = db.Column(db.Integer, db.ForeignKey('school_classes.id'), nullable=False)
    subject = db.Column(db.String(100), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    max_score = db.Column(db.Float, nullable=False)
    exam_date = db.Column(db.Date, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))  # the teacher
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    results = db.relationship('AssessmentResult', backref='assessment', lazy=True, cascade='all, delete-orphan')
# ------------------ ASSESSMENT RESULT ------------------

class AssessmentResult(db.Model):
    __tablename__ = 'assessment_results'

    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('assessments.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    score = db.Column(db.Float, nullable=False)
    feedback = db.Column(db.Text)
    recorded_at = db.Column(db.DateTime, default=datetime.utcnow)

    student = db.relationship('User')

class SchoolDashboardSettings(db.Model):
    __tablename__ = 'school_dashboard_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=False, unique=True)
    
    # Branding settings
    primary_color = db.Column(db.String(7), default='#3B82F6')
    secondary_color = db.Column(db.String(7), default='#10B981')
    logo_url = db.Column(db.String(255))
    
    # Module settings (JSON field)
    enabled_modules = db.Column(db.JSON, default=lambda: {
        'attendance': True,
        'fees': True,
        'grades': True,
        'events': True,
        'announcements': True,
        'library': False,
        'transport': False
    })
    
    # Dashboard configuration
    dashboard_config = db.Column(db.JSON, default=lambda: {
        'default_widgets': [
            'stats_overview',
            'enrollment_chart',
            'attendance_overview',
            'activity_feed',
            'quick_actions'
        ],
        'layout_templates': ['default', 'compact', 'detailed']
    })
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'school_id': self.school_id,
            'primary_color': self.primary_color,
            'secondary_color': self.secondary_color,
            'logo_url': self.logo_url,
            'enabled_modules': self.enabled_modules,
            'dashboard_config': self.dashboard_config
        }

class UserDashboardPreferences(db.Model):
    __tablename__ = 'user_dashboard_preferences'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    
    # Widget preferences
    enabled_widgets = db.Column(db.JSON, default=lambda: {
        'stats_overview': True,
        'enrollment_chart': True,
        'attendance_overview': True,
        'activity_feed': True,
        'quick_actions': True,
        'fee_status': True,
        'announcements': True,
        'custom_links': False
    })
    
    # Layout configuration
    layout_config = db.Column(db.JSON, default=lambda: {
        'widget_positions': {},
        'layout_template': 'default',
        'sidebar_collapsed': False
    })
    
    # Notification preferences
    notification_settings = db.Column(db.JSON, default=lambda: {
        'email_notifications': True,
        'browser_notifications': True,
        'activity_notifications': True
    })
    
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'user_id': self.user_id,
            'enabled_widgets': self.enabled_widgets,
            'layout_config': self.layout_config,
            'notification_settings': self.notification_settings
        }

class Activity(db.Model):
    __tablename__ = 'activities'
    
    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    activity_type = db.Column(db.String(50), nullable=False)  # e.g., 'student_added', 'teacher_added'
    description = db.Column(db.Text, nullable=False)
    activity_data = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    school = db.relationship('School', backref='school_activities')  # Changed backref name
    user = db.relationship('User', backref='user_activities')  # Changed backref name
    
    def to_dict(self):
        return {
            'id': self.id,
            'activity_type': self.activity_type,
            'description': self.description,
            'user': self.user.full_name if self.user else 'System',
            'metadata': self.activity_data,
            'created_at': self.created_at.isoformat(),
            'time_ago': self.get_time_ago(),
            'icon': self.get_icon()
        }
    
    def get_time_ago(self):
        """Calculate human-readable time difference"""
        diff = datetime.utcnow() - self.created_at
        
        if diff.days > 0:
            return f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        else:
            return "Just now"
    
    def get_icon(self):
        """Return appropriate icon based on activity type"""
        icon_map = {
            'student_added': 'User',
            'teacher_added': 'UserCheck',
            'fee_payment': 'DollarSign',
            'subject_added': 'BookOpen',
            'class_added': 'BookOpen',
            'default': 'Activity'
        }
        return icon_map.get(self.activity_type, icon_map['default'])

# activity_logger.py
def log_activity(school_id, user_id, activity_type, description, data=None):
    """
    Utility function to log an activity
    """
    activity = Activity(
        school_id=school_id,
        user_id=user_id,
        activity_type=activity_type,
        description=description,
        activity_data=data or {}
    )
    db.session.add(activity)
    db.session.commit()
    return activity

class SchoolAnnouncement(db.Model):
    __tablename__ = 'school_announcements'
    
    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text, nullable=False)
    priority = db.Column(db.Enum('low', 'medium', 'high', 'urgent', name='announcement_priority'), default='medium')
    target_audience = db.Column(JSONB, nullable=False, default=['all'])    
    is_published = db.Column(db.Boolean, default=False)
    publish_date = db.Column(db.DateTime)
    expiry_date = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    author = db.relationship('User', backref='announcements')
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'priority': self.priority,
            'target_audience': self.target_audience,
            'author': self.author.full_name,
            'is_published': self.is_published,
            'publish_date': self.publish_date.isoformat() if self.publish_date else None,
            'expiry_date': self.expiry_date.isoformat() if self.expiry_date else None,
            'created_at': self.created_at.isoformat()
        }

# ------------------ SUBJECT MODEL ------------------

class Subject(db.Model):
    __tablename__ = 'subjects'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)  # <-- No unique=True here
    code = db.Column(db.String(20))                   # <-- No unique=True here
    description = db.Column(db.Text)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('school_id', 'name', name='uq_subject_name_per_school'),
        db.UniqueConstraint('school_id', 'code', name='uq_subject_code_per_school'),
    )
    #relationships
    teachers = db.relationship('User',secondary=teacher_subject,back_populates='subjects')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'description': self.description,
            'school_id': self.school_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }













 # General (public) resources
class GeneralResource(db.Model):
    __tablename__ = 'general_resources'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    file_url = db.Column(db.String(255), nullable=False)
    thumbnail_url = db.Column(db.String(255))
    resource_type = db.Column(db.String(50), nullable=False)  # 'past_paper' | 'notes' | 'video'
    subject = db.Column(db.String(50))
    year = db.Column(db.Integer)
    downloads = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # ↳ ownership
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    uploader = db.relationship('User', backref='general_resources')

# ──────────────────────────────────────────────────────────
# ▶︎ Rotating banners shown on homepage
class Banner(db.Model):
    __tablename__ = 'banners'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    image_url = db.Column(db.String(255))
    target_url = db.Column(db.String(255))
    banner_type = db.Column(db.String(50), nullable=False)  # 'resource' | 'class' | 'discussion'
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime)

# ──────────────────────────────────────────────────────────
# ▶︎ Cross‑school live classes
class LiveClass(db.Model):
    __tablename__ = 'live_classes'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    subject = db.Column(db.String(50), nullable=False)

    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    teacher = db.relationship('User', backref='live_classes')

    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)
    meeting_link = db.Column(db.String(255), nullable=False)

    max_participants = db.Column(db.Integer)
    registered_count = db.Column(db.Integer, default=0)

    is_recurring = db.Column(db.Boolean, default=False)
    recurrence_pattern = db.Column(db.String(50))  # 'daily' | 'weekly' | etc.

    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Forum(db.Model):
     __tablename__ = 'forums'
    
     id = db.Column(db.Integer, primary_key=True)
     title = db.Column(db.String(255), nullable=False)
     subject = db.Column(db.String(100), nullable=False)
     content = db.Column(db.Text, nullable=False)
     author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
     school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=False)
     replies_count = db.Column(db.Integer, default=0)
     is_active = db.Column(db.Boolean, default=True)
     created_at = db.Column(db.DateTime, default=datetime.utcnow)
     updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
     author = db.relationship('User', backref='forum_threads')
     school = db.relationship('School', backref='forum_threads')
     replies = db.relationship('ForumReply', backref='forum_thread', lazy='dynamic', cascade='all, delete-orphan')
    
     def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'subject': self.subject,
            'content': self.content,
            'author': f"{self.author.first_name} {self.author.last_name}",
            'school': self.school.name,
            'replies_count': self.replies_count,
            'created_at': self.created_at.isoformat(),
            'replies': [reply.to_dict() for reply in self.replies.order_by(ForumReply.created_at.asc())]
        }
class ForumReply(db.Model):
    __tablename__ = 'forum_replies'
    
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    forum_id = db.Column(db.Integer, db.ForeignKey('forums.id'), nullable=False)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=False)
    parent_reply_id = db.Column(db.Integer, db.ForeignKey('forum_replies.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    author = db.relationship('User', backref='forum_replies')
    school = db.relationship('School', backref='forum_replies')
    parent_reply = db.relationship('ForumReply', remote_side=[id], backref='child_replies')
    
    def to_dict(self):
        return {
            'id': self.id,
            'content': self.content,
            'author': f"{self.author.first_name} {self.author.last_name}",
            'school': self.school.name,
            'created_at': self.created_at.isoformat(),
            'parent_reply_id': self.parent_reply_id
        }

class Competition(db.Model):
    __tablename__ = 'competitions'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    host_school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=False)
    created_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    deadline = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), default='active')  # active, completed, cancelled
    max_participants = db.Column(db.Integer, nullable=True)
    prize_description = db.Column(db.Text, nullable=True)
    rules = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    host_school = db.relationship('School', backref='hosted_competitions')
    created_by = db.relationship('User', backref='created_competitions')
    participants = db.relationship('CompetitionParticipant', backref='competition', cascade='all, delete-orphan')
    
    @property
    def participants_count(self):
        return len(self.participants)
    
    @property
    def leaderboard(self):
        return sorted(self.participants, key=lambda x: x.score or 0, reverse=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'host_school': self.host_school.name,
            'created_by': f"{self.created_by.first_name} {self.created_by.last_name}",
            'deadline': self.deadline.isoformat(),
            'status': self.status,
            'participants_count': self.participants_count,
            'max_participants': self.max_participants,
            'prize_description': self.prize_description,
            'rules': self.rules,
            'created_at': self.created_at.isoformat(),
            'leaderboard': [p.to_dict() for p in self.leaderboard[:10]]  # Top 10
        }

class CompetitionParticipant(db.Model):
    __tablename__ = 'competition_participants'
    
    id = db.Column(db.Integer, primary_key=True)
    competition_id = db.Column(db.Integer, db.ForeignKey('competitions.id'), nullable=False)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    score = db.Column(db.Integer, default=0)
    submission_url = db.Column(db.String(500), nullable=True)
    submission_text = db.Column(db.Text, nullable=True)
    submitted_at = db.Column(db.DateTime, nullable=True)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    school = db.relationship('School', backref='competition_participations')
    teacher = db.relationship('User', backref='competition_participations')
    
    # Unique constraint to prevent duplicate participation
    __table_args__ = (db.UniqueConstraint('competition_id', 'school_id', name='unique_school_competition'),)
    
    def to_dict(self):
        return {
            'id': self.id,
            'school': self.school.name,
            'teacher': f"{self.teacher.first_name} {self.teacher.last_name}",
            'score': self.score,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'joined_at': self.joined_at.isoformat()
        }

class TutoringSession(db.Model):
    __tablename__ = 'tutoring_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    subject = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    tutor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=False)
    time_slot = db.Column(db.DateTime, nullable=False)
    duration_minutes = db.Column(db.Integer, default=60)
    max_students = db.Column(db.Integer, default=20)
    meeting_link = db.Column(db.String(500), nullable=True)
    meeting_password = db.Column(db.String(50), nullable=True)
    status = db.Column(db.String(20), default='scheduled')  # scheduled, ongoing, completed, cancelled
    is_cross_school = db.Column(db.Boolean, default=True)  # Allow students from other schools
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tutor = db.relationship('User', backref='tutoring_sessions')
    school = db.relationship('School', backref='tutoring_sessions')
    enrollments = db.relationship('TutoringEnrollment', backref='session', cascade='all, delete-orphan')
    
    @property
    def enrolled_count(self):
        return len(self.enrollments)
    
    @property
    def available_slots(self):
        return max(0, self.max_students - self.enrolled_count)
    
    def to_dict(self):
        return {
            'id': self.id,
            'subject': self.subject,
            'description': self.description,
            'tutor_name': f"{self.tutor.first_name} {self.tutor.last_name}",
            'school': self.school.name,
            'time_slot': self.time_slot.isoformat(),
            'duration_minutes': self.duration_minutes,
            'enrolled_count': self.enrolled_count,
            'max_students': self.max_students,
            'available_slots': self.available_slots,
            'meeting_link': self.meeting_link,
            'status': self.status,
            'is_cross_school': self.is_cross_school,
            'created_at': self.created_at.isoformat()
        }

class TutoringEnrollment(db.Model):
    __tablename__ = 'tutoring_enrollments'
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('tutoring_sessions.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # For student enrollments
    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # For teacher enrollments
    school_id = db.Column(db.Integer, db.ForeignKey('schools.id'), nullable=False)
    enrollment_type = db.Column(db.String(20), default='student')  # student, teacher
    attended = db.Column(db.Boolean, default=False)
    rating = db.Column(db.Integer, nullable=True)  # 1-5 rating after session
    feedback = db.Column(db.Text, nullable=True)
    enrolled_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    student = db.relationship('User', foreign_keys=[student_id], backref='tutoring_enrollments_as_student')
    teacher = db.relationship('User', foreign_keys=[teacher_id], backref='tutoring_enrollments_as_teacher')
    school = db.relationship('School', backref='tutoring_enrollments')
    
    # Unique constraint to prevent duplicate enrollment
    __table_args__ = (
        db.UniqueConstraint('session_id', 'student_id', name='unique_student_session'),
        db.UniqueConstraint('session_id', 'teacher_id', name='unique_teacher_session'),
    )
    
    def to_dict(self):
        participant_name = ""
        if self.student:
            participant_name = f"{self.student.first_name} {self.student.last_name}"
        elif self.teacher:
            participant_name = f"{self.teacher.first_name} {self.teacher.last_name}"
            
        return {
            'id': self.id,
            'participant_name': participant_name,
            'school': self.school.name,
            'enrollment_type': self.enrollment_type,
            'attended': self.attended,
            'rating': self.rating,
            'feedback': self.feedback,
            'enrolled_at': self.enrolled_at.isoformat()
        }