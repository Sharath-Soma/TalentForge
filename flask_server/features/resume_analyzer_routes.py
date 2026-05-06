from flask import Blueprint, request, jsonify, current_app
from ..pages.extract import extract_text_from_pdf
import random

resume_analyzer_bp = Blueprint('resume_analyzer', __name__, url_prefix='/api/resume')

@resume_analyzer_bp.route('/analyze', methods=['POST'])
def analyze_resume():
    if 'resume_file' not in request.files:
        return jsonify({"error": "No resume file provided"}), 400
    
    resume_file = request.files['resume_file']
    job_description = request.form.get('job_description', '')

    if not job_description:
        return jsonify({"error": "Job description is required for analysis"}), 400

    try:
        # Extract text from PDF
        resume_text = extract_text_from_pdf(resume_file, current_app.logger)
        
        # Simulate ATS Analysis
        # In a real app, we'd use SBERT or an LLM here.
        skills_found = ["React", "JavaScript", "Python", "Flask", "SQL"]
        job_keywords = ["Docker", "Kubernetes", "AWS", "CI/CD", "Microservices"]
        
        missing_skills = [skill for skill in job_keywords if skill.lower() not in resume_text.lower()]
        
        analysis = {
            "score": random.randint(65, 85),
            "matched_skills": skills_found,
            "missing_skills": missing_skills,
            "keyword_match": random.randint(50, 75),
            "suggestions": "Your resume has a strong foundation, but it lacks specific mentions of cloud infrastructure and containerization which are highly relevant for this role."
        }

        return jsonify(analysis), 200

    except Exception as e:
        current_app.logger.error(f"Error in resume analysis: {e}")
        return jsonify({"error": str(e)}), 500

@resume_analyzer_bp.route('/optimize', methods=['POST'])
def optimize_resume():
    if 'resume_file' not in request.files:
        return jsonify({"error": "No resume file provided"}), 400
    
    job_description = request.form.get('job_description', '')

    try:
        # Simulate Optimization Results
        optimization = {
            "improved_bullets": [
                "Led the development of a high-performance Flask backend, improving API response times by 30% through optimized SQL queries.",
                "Architected a scalable React frontend using Context API and custom hooks, reducing code duplication by 40%.",
                "Implemented automated CI/CD pipelines using GitHub Actions, streamlining the deployment process for a team of 10 developers."
            ],
            "optimized_keywords": ["Docker", "Kubernetes", "AWS CloudFormation", "Terraform", "Prometheus", "Grafana"],
            "summary_improvement": "Strategic Full-Stack Developer with 5+ years of experience in building scalable web applications. Expert in Python/Flask and React, with a growing focus on cloud-native architectures and DevOps best practices."
        }

        return jsonify(optimization), 200

    except Exception as e:
        current_app.logger.error(f"Error in resume optimization: {e}")
        return jsonify({"error": str(e)}), 500
