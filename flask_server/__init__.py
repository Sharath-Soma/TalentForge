import os
import logging
from time import perf_counter
from flask import Flask, jsonify, request # Ensure 'request' is imported
from flask_cors import CORS

# Use relative imports because these files are part of the 'flask_server' package
from .config import Config
from .user.services import init_app as init_user_login_services # From user/services.py
from .user.models import db as user_db                       # From user/models.py (SQLAlchemy instance)
from .auth.services import init_app as init_auth_oauth_services # From auth/services.py
from .auth import auth_bp                                     # From auth/__init__.py
from .course_recommender import course_bp                     # From course_recommender/__init__.py
from .features.jobs_routes import jobs_bp                     # From features/jobs_routes.py
from .features.resume_tools_routes import resume_tools_bp     # From features/resume_tools_routes.py
from .features.ai_practice_routes import ai_practice_bp       # From features/ai_practice_routes.py
from .features.resume_analyzer_routes import resume_analyzer_bp
from .features.compiler_routes import compiler_bp
from .pages.load_model import get_bert_model_status

# This is the application factory
def create_app(config_class=Config):
    startup_started_at = perf_counter()
    app = Flask("flask_server") # Or app = Flask(__name__)
    app.config.from_object(config_class)

    # Configure logging
    log_level = logging.DEBUG if app.debug or os.getenv('FLASK_ENV') == 'development' else logging.INFO
    if not app.logger.handlers: # Avoid adding duplicate handlers if create_app is called multiple times
        stream_handler = logging.StreamHandler()
        # More detailed formatter for better debugging
        formatter = logging.Formatter('%(asctime)s %(levelname)s %(name)s [%(module)s.%(funcName)s l:%(lineno)d]: %(message)s')
        stream_handler.setFormatter(formatter)
        app.logger.addHandler(stream_handler)
    app.logger.setLevel(log_level)
    
    config_class.validate_config(app.logger) # Validate essential configurations

    # --- CORS Configuration ---
    frontend_url_from_config = app.config.get('FRONTEND_URL')

    cors_origins_to_use = []
    if frontend_url_from_config:
        if frontend_url_from_config == "*":
            cors_origins_to_use = "*"
        else:
            # Handles a single URL or a comma-separated list of URLs
            cors_origins_to_use = [origin.strip() for origin in frontend_url_from_config.split(',')]
    
    # Add development/local network origins for mobile testing
    # These allow testing from local IPs like http://192.168.1.x:5173
    if app.debug or os.getenv('FLASK_ENV') == 'development':
        development_origins = [
            'http://localhost:5173',
            'http://localhost:3000',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:3000',
            # Local network addresses will be matched by the pattern below
        ]
        if isinstance(cors_origins_to_use, list):
            cors_origins_to_use.extend(development_origins)
        elif cors_origins_to_use != "*":
            cors_origins_to_use = development_origins

    app.logger.info(f"CORS origins configured: {cors_origins_to_use}")

    CORS(app, 
         origins=cors_origins_to_use,
         supports_credentials=True,
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], 
         allow_headers=["Content-Type", "Authorization", "X-Requested-With", "X-CSRF-Token", "ngrok-skip-browser-warning"],
         expose_headers=["Content-Type", "Link"]
    )
    # --- End CORS Configuration ---

    # --- Initialize Database (SQLAlchemy) ---
    user_db.init_app(app) # Initialize SQLAlchemy with the Flask app instance
    # Create database tables if they don't exist. This needs an application context.
    with app.app_context():
        try:
            user_db.create_all() # Creates tables defined in user.models.py (and other models if any)
            app.logger.info("Database tables checked/created (if necessary via SQLAlchemy user_db.create_all()).")
        except Exception as e:
            app.logger.error(f"Error creating/checking database tables: {e}", exc_info=True)
    # --- End Initialize Database ---

    # Initialize Flask-Login (uses the User model which now uses SQLAlchemy)
    init_user_login_services(app)
    
    # Initialize Authlib OAuth clients
    init_auth_oauth_services(app)

    # Heavy models load lazily on first request that needs them.
    app.config['SBERT_MODEL'] = None
    app.config['SBERT_MODEL_LOADED'] = False

    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(course_bp)
    app.register_blueprint(jobs_bp)
    app.register_blueprint(resume_tools_bp)
    app.register_blueprint(ai_practice_bp)
    app.register_blueprint(resume_analyzer_bp)
    app.register_blueprint(compiler_bp)
    app.logger.info("All application blueprints registered.")

    # Root Route
    @app.route('/')
    def root_api_welcome():
        app.logger.debug(f"Root route / accessed by {request.remote_addr}") # 'request' is now imported
        sbert_status = get_bert_model_status().get("status", "Unknown")
        
        return jsonify({
            "message": "API Welcome (v2.3 - PostgreSQL User Store Active)", # Updated message for clarity
            "sbert_model_status": sbert_status,
            "course_recommender_status": "IDLE",
            "configured_frontend_url_for_cors": app.config.get('FRONTEND_URL')
        })

    app.logger.info(
        "Flask application '%s' (with SQLAlchemy) created successfully in %.3fs.",
        app.name,
        perf_counter() - startup_started_at,
    )
    return app
