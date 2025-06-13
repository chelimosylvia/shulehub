import os
import sys

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import your app
try:
    from backend.app import create_app
except ImportError:
    # If backend is not a package, try direct import
    from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)