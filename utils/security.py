import secrets
import string
from werkzeug.security import generate_password_hash, check_password_hash

def generate_default_password(length=6):
    """Generate a simpler random password (6 characters)"""
    # Use only letters and digits (no special characters)
    characters = string.ascii_letters + string.digits
    # Ensure at least one digit for basic complexity
    while True:
        password = ''.join(secrets.choice(characters) for _ in range(length))
        if any(c.isdigit() for c in password):
            return password

def validate_password_complexity(password):
    """Check if password meets complexity requirements"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one digit"
    return True, "Password meets complexity requirements"