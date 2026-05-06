# flask_server/course_recommender/routes.py
from flask import Blueprint, request, jsonify, current_app

course_bp = Blueprint('course_recommender', __name__, url_prefix='/api')

@course_bp.route('/course_predict', methods=['POST'])
def predict_courses_route_handler(): # Renamed to avoid clashes if you combine files later
    data = request.get_json()
    if not data: return jsonify({"error": "No input data"}), 400
    job_title = data.get('job_title', '')
    job_description = data.get('job_description', '')
    if not job_title and not job_description:
        return jsonify({"error": "Job title or description required"}), 400

    current_app.logger.info(f"Course prediction request for: '{job_title}'")
    from .service import get_predictions

    recommendations, message = get_predictions(job_title, job_description)

    if not recommendations and ("error" in message.lower() or "not found" in message.lower() or "missing" in message.lower()):
        current_app.logger.error(f"Error from course recommender service: {message}")
        status_code = 503 if "model" in message.lower() or "missing" in message.lower() else 500
        return jsonify({"error": message, "courses": []}), status_code
    
    return jsonify({"courses": recommendations, "message": message}), 200

@course_bp.route('/health_recommender', methods=['GET'])
def health_check_recommender():
    from .service import get_model_status

    status_info = get_model_status(load_if_needed=True)
    return jsonify(status_info), 200 if status_info["status"] == "UP" else 503
