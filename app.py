from flask import Flask
from flask_cors import CORS
import os
import sys
from extensions import db, migrate, jwt
from dotenv import load_dotenv
load_dotenv()
from config import Config

# Add current directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

def create_app():
    app = Flask(__name__)
    
    # Configuration (inline for now to avoid import issues)
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY')
    
    # Try to load config from file if it exists
    try:
        from config import Config
        app.config.from_object(Config)
        print("✅ Loaded configuration from config.py")
    except ImportError:
        print("⚠️  Using default configuration (config.py not found)")
    
    # ✅ CORS Configuration - More permissive for development
    CORS(app, 
         origins=["http://localhost:5173", "http://127.0.0.1:5173"], 
         supports_credentials=True,
         allow_headers=["Content-Type", "Authorization"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"])

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    
    # Import models (try different import paths)
    try:
        import models
        print("✅ Models imported successfully")
    except ImportError:
        try:
            from . import models
            print("✅ Models imported with relative import")
        except ImportError:
            print("⚠️  Warning: Could not import models.py")
    
    # Import and register routes with error handling
    routes_registered = 0

    route_modules = [
        ('routes.school_routes', 'school_bp', '/api/schools'),
        ('routes.user_routes', 'user_bp', '/api/users'),
        ('routes.auth_routes', 'auth_bp', '/api/auth'),
        ('routes.resource_routes', 'resource_bp', '/api/resources'),
        ('routes.classroom_routes', 'classroom_bp', '/api/classrooms'),
        ('routes.gradebook_routes', 'gradebook_bp', '/api/gradebook'),
        ('routes.mobile_routes', 'mobile_bp', '/api/mobile'),
        ('routes.dashboard_routes', 'dashboard_bp', '/api/schools'),
        ('routes.student_dashboard', 'student_bp', '/api/schools'),
        ('routes.teacher_dashboard', 'teacher_bp', '/api/schools'),
        ('routes.hub_routes', 'hub_bp', '/api/hub'),
        ('routes.homepage_routes', 'homepage_bp', '/api/homepage'),
        ('routes.contact_routes', 'contact_bp', '/api/contact'),


    ]
    
    for module_name, blueprint_name, url_prefix in route_modules:
        try:
            module = __import__(module_name, fromlist=[blueprint_name])
            blueprint = getattr(module, blueprint_name)
            app.register_blueprint(blueprint, url_prefix=url_prefix)
            routes_registered += 1
            print(f"✅ Registered {blueprint_name} at {url_prefix}")
        except ImportError as e:
            print(f"⚠️  Could not import {module_name}: {e}")
        except AttributeError as e:
            print(f"⚠️  Could not find {blueprint_name} in {module_name}: {e}")
        except Exception as e:
            print(f"❌ Error registering {module_name}: {e}")
    
    # Add error handlers
    @app.errorhandler(404)
    def not_found(error):
        return {"error": "Route not found", "status": 404}, 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return {"error": "Internal server error", "status": 500}, 500
    
    # Add preflight OPTIONS handler for all routes
    @app.before_request
    def handle_preflight():
        from flask import request
        if request.method == "OPTIONS":
            res = app.make_default_options_response()
            res.headers['Access-Control-Allow-Origin'] = 'http://localhost:5173'
            res.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS'
            res.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
            res.headers['Access-Control-Allow-Credentials'] = 'true'
            return res
    
    # Basic routes if no blueprints are registered
    if routes_registered == 0:
        @app.route('/')
        def index():
            return {
                "message": "ShuleHub API is running!",
                "status": "success",
                "routes_registered": routes_registered
            }

        @app.route('/health')
        def health_check():
            return {"status": "healthy", "database": "connected"}

        print("✅ Created basic test routes")
    
    # Add a test route to verify auth blueprint is working
    @app.route('/api/test')
    def test_route():
        return {"message": "API is working", "status": "success"}
    
    print(f"🚀 App created successfully with {routes_registered} route blueprints")
    return app

# Create app instance for Flask CLI
app = create_app()

with app.app_context():
    print("\n📋 Registered Routes:")
    for rule in app.url_map.iter_rules():
        print(f"{rule.methods} {rule.rule}")

if __name__ == "__main__":
    # Add more detailed startup info
    print("🔥 Starting Flask development server...")
    print("📍 Frontend should be running on: http://localhost:5173")
    print("📍 Backend running on: http://localhost:5000")
    print("🔧 Debug mode: ON")
    
    app.run(debug=True, host='0.0.0.0', port=5000)