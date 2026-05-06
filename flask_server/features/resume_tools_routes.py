# flask_server/features/resume_tools_routes.py
from flask import Blueprint, request, jsonify, current_app
from ..pages.extract import extract_text_from_pdf
from ..pages.load_model import get_bert_model

resume_tools_bp = Blueprint('resume_tools', __name__, url_prefix='/api')

@resume_tools_bp.route('/match_score', methods=['POST'])
def match_score_route_handler():
    sbert_model, sbert_loaded = get_bert_model(current_app.logger)
    current_app.config['SBERT_MODEL'] = sbert_model
    current_app.config['SBERT_MODEL_LOADED'] = sbert_loaded

    if not sbert_loaded:
        current_app.logger.error("Match score: SBERT model not loaded.")
        return jsonify({"error": "Scoring engine unavailable."}), 503

    if 'resume_file' not in request.files: return jsonify({"error": "No resume file"}), 400
    resume_file = request.files['resume_file']
    job_desc = request.form.get('job_description_text')
    if not job_desc: return jsonify({"error": "Job description missing"}), 400

    try:
        from ..pages.cosine_similarity import calculate_similarity

        resume_text = extract_text_from_pdf(resume_file, current_app.logger)
        score = calculate_similarity(resume_text, job_desc, sbert_model, current_app.logger)
        return jsonify({"match_score": score})
    except Exception as e:
        current_app.logger.error(f"Error in match_score: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@resume_tools_bp.route('/generate_resume', methods=['POST'])
def generate_resume_route_handler():
    ai_model_name = (current_app.config.get("OPENAI_MODEL") or "gpt-4.1-mini").strip()
    if 'base_resume_file' not in request.files: return jsonify({"error": "No base resume"}), 400
    base_resume_file = request.files['base_resume_file']
    target_job_title = request.form.get('target_job_title', '')
    target_job_description = request.form.get('target_job_description', '')
    if not target_job_title and not target_job_description:
        return jsonify({"error": "Target job title or description required"}), 400

    try:
        from ..pages.ai_utils import parse_resume_with_llm, generate_tailored_section, reassemble_resume

        base_resume_text = extract_text_from_pdf(base_resume_file, current_app.logger)
        parsed_data = parse_resume_with_llm(base_resume_text, current_app.logger, model=ai_model_name)
        
        modified_data = parsed_data.copy() # Start with a copy
        if modified_data.get("summary"):
            modified_data["summary"] = generate_tailored_section("summary", modified_data["summary"], target_job_title, target_job_description, current_app.logger, model=ai_model_name)
        if modified_data.get("experience"):
            updated_experience = []
            for job in modified_data["experience"]:
                 if job and job.get("responsibilities"):
                     job["responsibilities"] = generate_tailored_section("experience_responsibilities", job["responsibilities"], target_job_title, target_job_description, current_app.logger, model=ai_model_name)
                 updated_experience.append(job)
            modified_data["experience"] = updated_experience
        if modified_data.get("skills"):
             modified_data["skills"] = generate_tailored_section("skills", modified_data["skills"], target_job_title, target_job_description, current_app.logger, model=ai_model_name)

        generated_text = reassemble_resume(modified_data)
        return jsonify({"generated_resume_text": generated_text})
    except ConnectionError as ce:
        current_app.logger.error(f"AI service connection error in generate_resume: {ce}")
        return jsonify({"error": "AI service connection failed. Check OPENAI_API_KEY and outbound network access."}), 503
    except Exception as e:
        current_app.logger.error(f"Error in generate_resume: {e}", exc_info=True)
        return jsonify({"error": f"Resume generation failed: {str(e)}"}), 500
