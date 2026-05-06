from flask import Blueprint, current_app, jsonify, request

from ..openai_service import OpenAIServiceError, request_openai_json, request_openai_text

ai_practice_bp = Blueprint("ai_practice", __name__, url_prefix="/api")

INTERVIEW_QUESTIONS_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "questions": {
            "type": "array",
            "minItems": 5,
            "maxItems": 5,
            "items": {"type": "string"},
        }
    },
    "required": ["questions"],
}

INTERVIEW_FEEDBACK_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "feedback": {
            "type": "array",
            "minItems": 1,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "score": {"type": "integer", "minimum": 1, "maximum": 10},
                    "rating": {
                        "type": "string",
                        "enum": ["Excellent", "Good", "Needs Improvement"],
                    },
                    "feedback": {"type": "string"},
                    "tip": {"type": "string"},
                },
                "required": ["score", "rating", "feedback", "tip"],
            },
        }
    },
    "required": ["feedback"],
}

COURSE_RECOMMENDATIONS_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "courses": {
            "type": "array",
            "minItems": 6,
            "maxItems": 6,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "title": {"type": "string"},
                    "platform": {"type": "string"},
                    "description": {"type": "string"},
                    "level": {
                        "type": "string",
                        "enum": ["Beginner", "Intermediate", "Advanced"],
                    },
                },
                "required": ["title", "platform", "description", "level"],
            },
        }
    },
    "required": ["courses"],
}


def _handle_openai_error(error):
    current_app.logger.error("OpenAI route error: %s", error.log_message, exc_info=True)
    return jsonify({"error": error.public_message}), error.status_code


@ai_practice_bp.route("/generate_interview_questions", methods=["POST"])
def generate_questions_route():
    data = request.get_json(silent=True) or {}
    job_role = data.get("job_role", "").strip()
    context_keywords = data.get("context_keywords", "").strip()

    if not job_role:
        return jsonify({"error": "Job role required"}), 400

    prompt = f"""Role: {job_role}
Extra context: {context_keywords or "None"}

Generate exactly 5 interview questions tailored to this role.
- Include 2 behavioral questions
- Include 2 technical questions
- Include 1 situational question
- Mention realistic technologies, tools, or scenarios when relevant
- Avoid generic filler questions
"""

    instructions = (
        "You are a senior technical interviewer. Return only valid JSON matching the schema. "
        "Questions must be role-specific, concise, and professional."
    )

    try:
        response_data = request_openai_json(
            prompt,
            current_app.logger,
            instructions=instructions,
            schema_name="interview_questions",
            schema=INTERVIEW_QUESTIONS_SCHEMA,
            max_output_tokens=900,
        )
        questions = [question.strip() for question in response_data.get("questions", []) if isinstance(question, str) and question.strip()]
        return jsonify({"questions": questions[:5]}), 200
    except OpenAIServiceError as error:
        return _handle_openai_error(error)
    except Exception as error:
        current_app.logger.error("Unexpected error generating interview questions: %s", error, exc_info=True)
        return jsonify({"error": "Unable to generate interview questions right now."}), 500


@ai_practice_bp.route("/evaluate_answers", methods=["POST"])
def evaluate_answers_route_handler():
    data = request.get_json(silent=True) or {}
    job_role = (data.get("job_role") or "").strip()
    q_and_a = data.get("questions_and_answers") or []

    if not job_role or not isinstance(q_and_a, list) or not q_and_a:
        return jsonify({"error": "Missing interview role or answers."}), 400

    formatted_qa = []
    for index, item in enumerate(q_and_a, start=1):
        question = (item.get("question") or "").strip()
        answer = (item.get("answer") or "").strip() or "(No answer provided)"
        if question:
            formatted_qa.append(f"Q{index}: {question}\nAnswer: {answer}")

    if not formatted_qa:
        return jsonify({"error": "No valid interview answers were provided."}), 400

    prompt = f"""Role: {job_role}

Evaluate the following interview answers:

{chr(10).join(chr(10) + block for block in formatted_qa)}
"""

    instructions = (
        "You are a senior interviewer. Return only valid JSON matching the schema. "
        "For each answer, provide a score from 1 to 10, a rating, concise constructive feedback, and one actionable tip."
    )

    try:
        response_data = request_openai_json(
            prompt,
            current_app.logger,
            instructions=instructions,
            schema_name="interview_feedback",
            schema=INTERVIEW_FEEDBACK_SCHEMA,
            max_output_tokens=1400,
        )
        feedback = response_data.get("feedback", [])
        return jsonify({"feedback": feedback}), 200
    except OpenAIServiceError as error:
        return _handle_openai_error(error)
    except Exception as error:
        current_app.logger.error("Unexpected error evaluating interview answers: %s", error, exc_info=True)
        return jsonify({"error": "Unable to evaluate answers right now."}), 500


@ai_practice_bp.route("/recommend_courses", methods=["POST"])
def recommend_courses_route():
    data = request.get_json(silent=True) or {}
    job_role = data.get("job_role", "").strip()

    if not job_role:
        return jsonify({"error": "Job role required"}), 400

    prompt = f"""Target role: {job_role}

Recommend exactly 6 real online courses that would help a candidate land this role.
"""

    instructions = (
        "You are a career coach and learning advisor. Return only valid JSON matching the schema. "
        "Courses must be real, specific, practical, and directly relevant to the target role."
    )

    try:
        response_data = request_openai_json(
            prompt,
            current_app.logger,
            instructions=instructions,
            schema_name="course_recommendations",
            schema=COURSE_RECOMMENDATIONS_SCHEMA,
            max_output_tokens=1400,
        )
        return jsonify({"courses": response_data.get("courses", [])[:6]}), 200
    except OpenAIServiceError as error:
        return _handle_openai_error(error)
    except Exception as error:
        current_app.logger.error("Unexpected error generating course recommendations: %s", error, exc_info=True)
        return jsonify({"error": "Unable to generate course recommendations right now."}), 500


@ai_practice_bp.route("/generate_cover_letter", methods=["POST"])
def generate_cover_letter_route():
    data = request.get_json(silent=True) or {}
    job = data.get("job") or {}
    profile = data.get("profile") or {}

    job_title = (job.get("title") or "").strip()
    company = (job.get("company") or "").strip()
    if not job_title:
        return jsonify({"error": "Job title is required."}), 400

    prompt = f"""Write a professional cover letter for this job application.

Job Title: {job_title}
Company: {company or "Company"}
Location: {job.get("location") or "Not specified"}
Required Skills: {", ".join(job.get("tags") or []) or "Not specified"}
Job Description: {job.get("description") or "Not provided"}

Applicant Profile:
Name: {profile.get("fullName") or "Applicant"}
Summary: {profile.get("summary") or "Experienced professional"}
Skills: {", ".join(profile.get("skills") or []) or "Various relevant skills"}
Education: {profile.get("degree") or ""} at {profile.get("college") or ""}
Experience: {", ".join(f"{item.get('jobTitle') or item.get('title') or 'Role'} at {item.get('company') or 'Company'}" for item in (profile.get('experiences') or [])) or "Relevant experience"}
"""

    instructions = (
        "You write concise, professional cover letters. Return plain text only. "
        "Use three short paragraphs, keep it under 300 words, tailor it to the role, and do not use placeholders."
    )

    try:
        letter = request_openai_text(
            prompt,
            current_app.logger,
            instructions=instructions,
            max_output_tokens=900,
        )
        return jsonify({"letter": letter.strip()}), 200
    except OpenAIServiceError as error:
        return _handle_openai_error(error)
    except Exception as error:
        current_app.logger.error("Unexpected error generating cover letter: %s", error, exc_info=True)
        return jsonify({"error": "Unable to generate a cover letter right now."}), 500
