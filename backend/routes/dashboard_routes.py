from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from models import School, User, Attendance, SchoolAnnouncement, Activity
from extensions import db
from collections import defaultdict
import calendar

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/schools')

@dashboard_bp.route('/<int:school_id>/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard_data(school_id):
    """Get complete dashboard data including stats, analytics, and config"""
    try:
        current_user = get_jwt_identity()
        
        # Handle both dict and string JWT identity formats
        if isinstance(current_user, dict):
            user_school_id = current_user.get('school_id')
            user_role = current_user.get('role')
        else:
            # If current_user is a string (user ID), need to fetch from database
            user = User.query.filter_by(id=current_user).first()
            if not user:
                return jsonify({'error': 'User not found'}), 404
            user_school_id = user.school_id
            user_role = user.role
        
        # Verify access
        if str(user_school_id) != str(school_id) and user_role != 'system_owner':
            return jsonify({'error': 'Unauthorized'}), 403
        
        school = School.query.get_or_404(school_id)
        
        # Get all dashboard data
        return jsonify({
            'school': {
                'id': school.id,
                'name': school.name,
                'logo_url': getattr(school, 'logo_url', None),
                'contact_info': getattr(school, 'contact_info', {})
            },
            'stats': get_school_stats(school_id),
            'analytics': get_school_analytics(school_id),
            'activities': get_recent_activities(school_id),
            'announcements': get_announcements(school_id),
            'config': {
                'school_branding': {
                    'primary_color': getattr(school, 'primary_color', "#3B82F6"),
                    'secondary_color': getattr(school, 'secondary_color', "#10B981"),
                    'logo_url': getattr(school, 'logo_url', None),
                    'school_name_display': True
                },
                'enabled_modules': {
                    'attendance': True,
                    'fees': True,
                    'grades': True,
                    'events': True,
                    'announcements': True
                },
                'enabled_widgets': {
                    'stats_overview': True,
                    'enrollment_chart': True,
                    'attendance_overview': True,
                    'activity_feed': True,
                    'quick_actions': True,
                    'fee_status': True,
                    'announcements': True,
                    'custom_links': False
                }
            }
        })

    except Exception as e:
        print(f"Dashboard error: {str(e)}")  # For debugging
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

def get_school_stats(school_id):
    """Get key statistics for dashboard"""
    try:
        today = datetime.today()
        start_of_week = today - timedelta(days=today.weekday())
        
        # Get student count
        students_count = User.query.filter_by(
            school_id=school_id, 
            role='student'
        ).filter(
            User.is_active.is_(True) if hasattr(User, 'is_active') else True
        ).count()
        
        # Get teacher count
        teachers_count = User.query.filter_by(
            school_id=school_id,
            role='teacher'
        ).filter(
            User.is_active.is_(True) if hasattr(User, 'is_active') else True
        ).count()
        
        # For now, return mock data for classes since SchoolClass isn't imported
        classes_count = 10  # You'll need to implement this based on your actual model
        
        return {
            'students': students_count,
            'teachers': teachers_count,
            'classes': classes_count,
            'attendance': {
                'daily': get_daily_attendance_rate(school_id, today),
                'weekly': get_weekly_attendance_rate(school_id, start_of_week)
            },
            'fees': {
                'paid': 75,  # Mock data - implement based on your fee model
                'pending': 20,
                'overdue': 5
            }
        }
    except Exception as e:
        print(f"Error in get_school_stats: {str(e)}")
        return {
            'students': 0,
            'teachers': 0,
            'classes': 0,
            'attendance': {'daily': 0, 'weekly': 0},
            'fees': {'paid': 0, 'pending': 0, 'overdue': 0}
        }

def get_school_analytics(school_id):
    """Get analytics data for dashboard"""
    try:
        return {
            'enrollment': get_enrollment_trends(school_id),
            'attendance': get_attendance_trends(school_id),
            'performance': get_performance_metrics(school_id),
            'fees': get_fee_distribution(school_id)
        }
    except Exception as e:
        print(f"Error in get_school_analytics: {str(e)}")
        return {
            'enrollment': {'labels': [], 'data': []},
            'attendance': {'labels': [], 'data': []},
            'performance': {'average_grade': 0, 'top_subjects': []},
            'fees': []
        }

def get_recent_activities(school_id, limit=10):
    """Get recent activities for the activity feed"""
    try:
        activities = []
        
        # Recent student enrollments
        recent_students = User.query.filter_by(
            school_id=school_id,
            role='student'
        ).order_by(User.created_at.desc()).limit(3).all()
        
        for student in recent_students:
            activities.append({
                'id': f"student_{student.id}",
                'type': 'enrollment',
                'message': f'New student {getattr(student, "full_name", getattr(student, "name", "Unknown"))} enrolled',
                'time': format_timesince(student.created_at),
                'icon': 'Users'
            })
        
        # Recent attendance updates
        recent_attendance = Attendance.query.filter_by(
            school_id=school_id
        ).order_by(Attendance.date.desc()).limit(3).all()
        
        for record in recent_attendance:
            student = User.query.get(record.student_id) if hasattr(record, 'student_id') else None
            student_name = getattr(student, 'full_name', getattr(student, 'name', 'Unknown')) if student else 'Unknown'
            activities.append({
                'id': f"attendance_{record.id}",
                'type': 'attendance',
                'message': f'Attendance marked for {student_name}',
                'time': format_timesince(record.date),
                'icon': 'UserCheck'
            })
        
        # Add some mock fee activities since FeePayment model isn't available
        activities.extend([
            {
                'id': 'fee_1',
                'type': 'fee',
                'message': 'Fee payment received from John Doe',
                'time': '2 hours ago',
                'icon': 'DollarSign'
            },
            {
                'id': 'fee_2',
                'type': 'fee',
                'message': 'Fee payment received from Jane Smith',
                'time': '1 day ago',
                'icon': 'DollarSign'
            }
        ])
        
        return activities[:limit]
    except Exception as e:
        print(f"Error in get_recent_activities: {str(e)}")
        return []

def get_announcements(school_id, limit=5):
    """Get recent school announcements"""
    try:
        announcements = SchoolAnnouncement.query.filter_by(
            school_id=school_id
        ).order_by(SchoolAnnouncement.created_at.desc()).limit(limit).all()
        
        return [{
            'id': ann.id,
            'title': ann.title,
            'content': ann.content,
            'priority': getattr(ann, 'priority_level', 'normal')
        } for ann in announcements]
    except Exception as e:
        print(f"Error in get_announcements: {str(e)}")
        # Return mock announcements if there's an error
        return [
            {
                'id': 1,
                'title': 'Welcome Back!',
                'content': 'Welcome to the new school term. Please check your schedules.',
                'priority': 'high'
            },
            {
                'id': 2,
                'title': 'Library Hours Updated',
                'content': 'The library will now be open until 6 PM on weekdays.',
                'priority': 'normal'
            }
        ]

def get_daily_attendance_rate(school_id, date):
    """Calculate daily attendance rate"""
    try:
        total_students = User.query.filter_by(
            school_id=school_id,
            role='student'
        ).filter(
            User.is_active.is_(True) if hasattr(User, 'is_active') else True
        ).count()
        
        if total_students == 0:
            return 0
        
        present_count = Attendance.query.filter(
            Attendance.school_id == school_id,
            Attendance.date == date,
            Attendance.status == 'present'
        ).count()
        
        return round((present_count / total_students) * 100, 1)
    except Exception as e:
        print(f"Error in get_daily_attendance_rate: {str(e)}")
        return 85.0  # Return mock data on error

def get_weekly_attendance_rate(school_id, start_date):
    """Calculate weekly attendance rate"""
    try:
        end_date = start_date + timedelta(days=6)
        total_students = User.query.filter_by(
            school_id=school_id,
            role='student'
        ).filter(
            User.is_active.is_(True) if hasattr(User, 'is_active') else True
        ).count()
        
        if total_students == 0:
            return 0
        
        present_count = Attendance.query.filter(
            Attendance.school_id == school_id,
            Attendance.date >= start_date,
            Attendance.date <= end_date,
            Attendance.status == 'present'
        ).count()
        
        possible_attendances = total_students * 5  # Assuming 5 school days
        if possible_attendances == 0:
            return 0
        
        return round((present_count / possible_attendances) * 100, 1)
    except Exception as e:
        print(f"Error in get_weekly_attendance_rate: {str(e)}")
        return 82.0  # Return mock data on error

def get_fee_distribution(school_id):
    """Get fee payment distribution for pie chart"""
    try:
        # Mock data since FeePayment model isn't available
        return [
            {
                'name': 'Paid',
                'value': 75,
                'color': '#10B981'
            },
            {
                'name': 'Pending',
                'value': 20,
                'color': '#F59E0B'
            },
            {
                'name': 'Overdue',
                'value': 5,
                'color': '#EF4444'
            }
        ]
    except Exception as e:
        print(f"Error in get_fee_distribution: {str(e)}")
        return []

def get_enrollment_trends(school_id, months=6):
    """Get enrollment trends for the last N months"""
    try:
        end_date = datetime.today()
        start_date = end_date - timedelta(days=30*months)
        
        # Generate month labels
        labels = []
        current_date = start_date.replace(day=1)
        while current_date <= end_date:
            labels.append(current_date.strftime('%b %Y'))
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year+1, month=1)
            else:
                current_date = current_date.replace(month=current_date.month+1)
        
        # Mock data for now - you can implement actual database queries later
        data = [12, 18, 25, 30, 28, 35][:len(labels)]
        while len(data) < len(labels):
            data.append(data[-1] + 2)  # Simple growth pattern
        
        return {
            'labels': labels,
            'data': data
        }
    except Exception as e:
        print(f"Error in get_enrollment_trends: {str(e)}")
        return {'labels': [], 'data': []}

def get_attendance_trends(school_id, weeks=4):
    """Get weekly attendance trends"""
    try:
        # Mock data for 7 days
        labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        data = [85, 87, 82, 90, 88, 75, 70]  # Mock attendance percentages
        
        return {
            'labels': labels,
            'data': data
        }
    except Exception as e:
        print(f"Error in get_attendance_trends: {str(e)}")
        return {'labels': [], 'data': []}

def get_performance_metrics(school_id):
    """Get performance metrics for the school"""
    try:
        # Mock data since Grade model isn't available
        return {
            'average_grade': 78.5,
            'top_subjects': [
                {'subject': 'Mathematics', 'average': 82.3},
                {'subject': 'Science', 'average': 79.8},
                {'subject': 'English', 'average': 77.2}
            ]
        }
    except Exception as e:
        print(f"Error in get_performance_metrics: {str(e)}")
        return {'average_grade': 0, 'top_subjects': []}

def format_timesince(dt):
    """Helper to format time since a datetime"""
    try:
        if dt is None:
            return "Unknown"
        
        now = datetime.now()
        if dt.tzinfo is not None:
            now = now.replace(tzinfo=dt.tzinfo)
        
        diff = now - dt
        
        if diff.days > 365:
            years = diff.days // 365
            return f"{years} year{'s' if years > 1 else ''} ago"
        elif diff.days > 30:
            months = diff.days // 30
            return f"{months} month{'s' if months > 1 else ''} ago"
        elif diff.days > 0:
            return f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        else:
            return "Just now"
    except Exception as e:
        print(f"Error in format_timesince: {str(e)}")
        return "Unknown"