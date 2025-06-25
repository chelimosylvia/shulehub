from flask import Blueprint, request, jsonify
import smtplib
from email.mime.text import MIMEText

contact_bp = Blueprint('contact', __name__, url_prefix='/api/contact')

# 🔐 Optional: you can use environment variables for these
SMTP_SERVER = 'smtp.gmail.com'
SMTP_PORT = 587
SMTP_USER = 'chelimosylvia280@gmail.com'
SMTP_PASSWORD = 'enhtjegxgtohwztk'  # generated from Gmail App Passwords
TO_EMAIL = 'chelimosylvia280@gmail.com'

@contact_bp.route('', methods=['POST'])
def send_message():
    data = request.get_json()
    name = data.get('name', '')
    email = data.get('email', '')
    message = data.get('message', '')

    if not name or not email or not message:
        return jsonify({'error': 'All fields are required.'}), 400

    try:
        subject = f"New Contact Message from {name}"
        body = f"Name: {name}\nEmail: {email}\n\nMessage:\n{message}"

        msg = MIMEText(body)
        msg['Subject'] = subject
        msg['From'] = SMTP_USER
        msg['To'] = TO_EMAIL

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)

        return jsonify({'message': 'Email sent successfully.'}), 200

    except Exception as e:
        print('Email error:', e)
        return jsonify({'error': 'Failed to send email.'}), 500
