# seed_homepage.py

from app import app, db
from models import Banner, GeneralResource, LiveClass
from datetime import datetime, timedelta

with app.app_context():
    # Clean up existing records (optional)
    Banner.query.delete()
    GeneralResource.query.delete()
    LiveClass.query.delete()
    db.session.commit()

    # Add a banner
    banner = Banner(
        title='Explore Biology Resources',
        description='Get the best revision materials now!',
        image_url='/static/banner1.jpg',
        target_url='/resources',
        banner_type='resource',
        is_active=True,
        expires_at=datetime.utcnow() + timedelta(days=30)
    )
    db.session.add(banner)

    # Add a general resource
    resource = GeneralResource(
        title='KCSE Biology Paper 1',
        description='2023 KCSE Biology questions and answers',
        file_url='/static/resources/biology_paper1.pdf',
        thumbnail_url='/static/thumbnails/biology.png',
        resource_type='past_paper',
        subject='biology',
        year=2023,
        downloads=12
    )
    db.session.add(resource)

    # Add a live class
    live_class = LiveClass(
        title='Photosynthesis Basics',
        description='Live class on photosynthesis',
        subject='Biology',
        teacher_id=1,  # Make sure this user exists
        start_time=datetime.utcnow() + timedelta(hours=2),
        end_time=datetime.utcnow() + timedelta(hours=3),
        meeting_link='https://zoom.com/classroom/123',
        max_participants=100,
        registered_count=10
    )
    db.session.add(live_class)

    db.session.commit()

    print("✅ Homepage seed data added successfully.")
