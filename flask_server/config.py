# # flask_server/config.py
# import os
# from dotenv import load_dotenv

# # Load environment variables from .env file in the flask_server directory
# BASE_DIR = os.path.abspath(os.path.dirname(__file__))
# load_dotenv(os.path.join(BASE_DIR, '.env')) # Correct path to .env

# class Config:
#     SECRET_KEY = os.getenv('FLASK_APP_SECRET_KEY')
#     GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
#     GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
#     FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173') # Default for Vite React

#     # Adzuna API Keys
#     ADZUNA_APP_ID = os.getenv('ADZUNA_APP_ID')
#     ADZUNA_APP_KEY = os.getenv('ADZUNA_APP_KEY')

#     # Add other configurations if needed

#     @staticmethod
#     def validate_config(app_logger):
#         if not Config.SECRET_KEY:
#             app_logger.critical("CRITICAL: No SECRET_KEY set for Flask application.")
#             raise ValueError("No SECRET_KEY set for Flask application.")
#         if not Config.GOOGLE_CLIENT_ID or not Config.GOOGLE_CLIENT_SECRET:
#             app_logger.warning("Google OAuth credentials not fully configured. Authentication may fail.")
#         if not Config.ADZUNA_APP_ID or not Config.ADZUNA_APP_KEY:
#             app_logger.warning("Adzuna API credentials not configured. Job fetching will fail.")





# flask_server/config.py
import os

from dotenv import load_dotenv

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
ENV_PATH = os.path.join(BASE_DIR, ".env")
load_dotenv(ENV_PATH, override=False)


def _clean_env_value(name, default=None):
    value = os.getenv(name)
    if value is None:
        return default

    cleaned = value.strip().strip('"').strip("'")
    if cleaned == "":
        return default
    return cleaned


def _mask_secret(value):
    if not value:
        return "missing"
    if len(value) <= 10:
        return "*" * len(value)
    return f"{value[:7]}...{value[-4:]}"


class Config:
    SECRET_KEY = _clean_env_value("FLASK_APP_SECRET_KEY")
    GOOGLE_CLIENT_ID = _clean_env_value("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET = _clean_env_value("GOOGLE_CLIENT_SECRET")
    FRONTEND_URL = _clean_env_value("FRONTEND_URL", "http://localhost:5173")
    ADZUNA_APP_ID = _clean_env_value("ADZUNA_APP_ID")
    ADZUNA_APP_KEY = _clean_env_value("ADZUNA_APP_KEY")
    OPENAI_API_KEY = _clean_env_value("OPENAI_API_KEY")
    OPENAI_MODEL = _clean_env_value("OPENAI_MODEL", "gpt-4.1-mini")
    # Optional Judge0 URL for code execution service. Leave unset in production if not using local Judge0.
    JUDGE0_URL = _clean_env_value("JUDGE0_URL")

    # --- Database Configuration ---
    # Render provides DATABASE_URL automatically when a DB is linked.
    # For local development, you might set a local PostgreSQL URL in your .env
    SQLALCHEMY_DATABASE_URI = _clean_env_value("DATABASE_URL", "sqlite:///local_dev.db") # Fallback to SQLite for local dev if DATABASE_URL not set
    SQLALCHEMY_TRACK_MODIFICATIONS = False # Recommended to disable
    # --- End Database Configuration ---

    @staticmethod
    def validate_config(app_logger):
        if not Config.SECRET_KEY:
            app_logger.critical("CRITICAL: No SECRET_KEY set for Flask application.")
            raise ValueError("No SECRET_KEY set for Flask application.")
        # ... other validations ...
        if not Config.SQLALCHEMY_DATABASE_URI:
            app_logger.warning("SQLALCHEMY_DATABASE_URI is not set. Database functionality may fail.")
        elif Config.SQLALCHEMY_DATABASE_URI == 'sqlite:///local_dev.db':
            app_logger.info("Using local SQLite database for development.")
        if not Config.OPENAI_API_KEY:
            app_logger.warning("OPENAI_API_KEY is not configured. AI text generation features will be unavailable.")
        else:
            app_logger.info(
                "OpenAI configuration loaded: key=%s model=%s env_file=%s",
                _mask_secret(Config.OPENAI_API_KEY),
                Config.OPENAI_MODEL,
                ENV_PATH,
            )
