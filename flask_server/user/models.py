# flask_server/user/models.py
from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy
from flask import current_app # For logging within static methods if needed
from werkzeug.security import generate_password_hash, check_password_hash

# Initialize SQLAlchemy. This 'db' object will be properly configured
# with the Flask app instance in flask_server/__init__.py
db = SQLAlchemy()

class User(UserMixin, db.Model):
    __tablename__ = 'users_v2' # Changed from jobber_users to force schema recreation

    id = db.Column(db.String, primary_key=True) # Google's 'sub' is a string
    name = db.Column(db.String(100), nullable=True)
    email = db.Column(db.String(100), unique=True, nullable=True)
    profile_pic = db.Column(db.String(255), nullable=True)
    password_hash = db.Column(db.String(255), nullable=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.email or self.id}>'

    @staticmethod
    def get(user_id):
        return User.query.get(user_id)

    @staticmethod
    def create_or_update(id, name=None, email=None, profile_pic=None, password=None):
        user = User.query.get(id)
        if user:
            if name is not None: user.name = name
            if email is not None: user.email = email 
            if profile_pic is not None: user.profile_pic = profile_pic
            if password is not None: user.set_password(password)
        else:
            user = User(id=id, name=name, email=email, profile_pic=profile_pic)
            if password:
                user.set_password(password)
            db.session.add(user)
        
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error committing user {id} to database: {e}", exc_info=True)
            raise 
        return user

class SavedJob(db.Model):
    __tablename__ = 'saved_jobs_v1'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String, db.ForeignKey('users_v2.id'), nullable=False)
    job_id = db.Column(db.String, nullable=False)
    job_title = db.Column(db.String(255), nullable=True)
    company_name = db.Column(db.String(100), nullable=True)
    job_data = db.Column(db.JSON, nullable=True) # Store full job snippet
    created_at = db.Column(db.DateTime, default=db.func.now())

    user = db.relationship('User', backref=db.backref('saved_jobs', lazy=True))