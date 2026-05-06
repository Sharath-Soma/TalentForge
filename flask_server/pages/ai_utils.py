import json
import os

def _default_model():
    return (os.getenv("OPENAI_MODEL") or "gpt-4.1-mini").strip()


def parse_resume_with_llm(resume_text, logger, model=None):
    model_name = model or _default_model()
    logger.info("Parsing resume with AI model %s (stubbed in ai_utils.py)", model_name)
    if not resume_text:
        raise ValueError("Resume text empty")
    try:
        return {
            "summary": "A passionate developer.",
            "experience": [{"title": "Dev", "company": "Comp", "dates": "Now", "responsibilities": ["Coding"]}],
            "education": [{"degree": "BS CS", "institution": "Uni", "dates": "Then"}],
            "skills": ["Python", "Flask"]
        }
    except Exception as e:
        logger.error("Error in parse_resume_with_llm (stub): %s", e)
        raise RuntimeError(f"AI resume parsing failed (stub): {e}")


def generate_tailored_section(section_type, original_content, job_title, job_description, logger, model=None):
    model_name = model or _default_model()
    logger.info("Generating tailored section %s with AI model %s (stubbed)", section_type, model_name)
    return original_content

def reassemble_resume(parsed_data):
    lines = []
    summary = parsed_data.get("summary")
    if summary:
        lines.append(summary)

    for skill in parsed_data.get("skills", []):
        if skill:
            lines.append(str(skill))

    for item in parsed_data.get("experience", []):
        if not isinstance(item, dict):
            continue
        header = " - ".join(part for part in [item.get("title"), item.get("company"), item.get("dates")] if part)
        if header:
            lines.append(header)
        for responsibility in item.get("responsibilities", []):
            if responsibility:
                lines.append(f"* {responsibility}")

    for item in parsed_data.get("education", []):
        if not isinstance(item, dict):
            continue
        header = " - ".join(part for part in [item.get("degree"), item.get("institution"), item.get("dates")] if part)
        if header:
            lines.append(header)

    return "\n".join(lines)


def generate_interview_questions_llm(job_role, context_keywords, logger, num_technical=3, num_behavioral=2, num_situational=2, model=None):
    model_name = model or _default_model()
    logger.info("Generating interview questions for %s with AI model %s (stubbed)", job_role, model_name)
    return {
        "technical_questions": [],
        "behavioral_questions": [],
        "situational_questions": [],
    }

def evaluate_single_answer_llm(job_title, job_description_snippet, question_text, candidate_answer, logger, model=None):
    model_name = model or _default_model()
    logger.info("Evaluating answer with AI model %s (stubbed)", model_name)
    return {"score": 80, "feedback_text": "Good answer (stubbed)."}
