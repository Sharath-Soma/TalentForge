import os
import requests
from flask import Blueprint, request, jsonify, current_app

compiler_bp = Blueprint('compiler', __name__, url_prefix='/api/compiler')

# Judge0 (code execution) is optional in production. Configure via environment variable or
# Flask config `JUDGE0_URL`. Do NOT default to localhost.
JUDGE0_TIMEOUT = (3, 30)

LANGUAGE_ID_MAP = {
    'python': 71,
    'javascript': 63,
    'java': 62,
    'cpp': 54
}

def parse_judge0_json(response):
    try:
        return response.json()
    except ValueError:
        return {"raw_response": response.text}


def build_error_payload(response_data, fallback_message="Failed to execute code with Judge0."):
    details = (
        response_data.get('stderr')
        or response_data.get('compile_output')
        or response_data.get('message')
        or response_data.get('error')
        or response_data.get('raw_response')
        or fallback_message
    )
    return {
        "stdout": response_data.get('stdout'),
        "stderr": response_data.get('stderr'),
        "compile_output": response_data.get('compile_output'),
        "status": response_data.get('status') or {"description": "Error"},
        "error": details,
    }


def build_success_payload(response_data):
    stdout = response_data.get('stdout')
    stderr = response_data.get('stderr')
    compile_output = response_data.get('compile_output')

    if not any([stdout, stderr, compile_output]):
        stdout = "Program finished with no output."

    return {
        "stdout": stdout,
        "stderr": stderr,
        "compile_output": compile_output,
        "status": response_data.get('status') or {"description": "Completed"},
        "time": response_data.get('time'),
        "memory": response_data.get('memory'),
    }

@compiler_bp.route('/run', methods=['POST'])
def run_code():
    data = request.get_json(silent=True) or {}
    code = data.get('code')
    language = data.get('language')
    stdin = data.get('stdin', '')

    if not code:
        return jsonify({"error": "No source code provided"}), 400
    
    language_id = LANGUAGE_ID_MAP.get(language)
    if not language_id:
        return jsonify({"error": f"Unsupported language: {language}"}), 400

    payload = {
        "language_id": language_id,
        "source_code": code,
        "stdin": stdin
    }

    headers = {
        "Content-Type": "application/json",
    }

    try:
        current_app.logger.info(
            "Judge0 submission request: language=%s url=%s code_length=%s stdin_length=%s",
            language,
            current_app.config.get('JUDGE0_URL') or os.getenv('JUDGE0_URL'),
            len(code),
            len(stdin),
        )
        current_app.logger.debug("Judge0 submission headers: %s", headers)
        judge0_url = current_app.config.get('JUDGE0_URL') or os.getenv('JUDGE0_URL')
        if not judge0_url:
            current_app.logger.warning("Judge0 (code execution) is not configured. Returning 503.")
            return jsonify({
                "stdout": None,
                "stderr": "Code execution feature is not available in this environment.",
                "compile_output": None,
                "status": {"description": "Service unavailable"},
                "error": "Judge0 URL not configured. Set JUDGE0_URL to enable code execution."
            }), 503

        response = requests.post(
            judge0_url,
            json=payload,
            headers=headers,
            timeout=JUDGE0_TIMEOUT,
        )
        response_data = parse_judge0_json(response)
        current_app.logger.info("Judge0 response status: %s", response.status_code)
        current_app.logger.debug("Judge0 response body: %s", response_data)

        if response.status_code not in (200, 201):
            current_app.logger.error("Judge0 submission failed: status=%s body=%s", response.status_code, response_data)
            error_payload = build_error_payload(response_data)
            return jsonify(error_payload), response.status_code

        return jsonify(build_success_payload(response_data)), 200

    except requests.exceptions.ConnectionError as exc:
        current_app.logger.error("Could not connect to Judge0 service: %s", exc, exc_info=True)
        return jsonify({
            "stdout": None,
            "stderr": "Could not reach configured Judge0 service.",
            "compile_output": None,
            "status": {"description": "Service unavailable"},
            "error": "Could not connect to configured Judge0 service."
        }), 503
    except Exception as e:
        current_app.logger.error(f"Error running code with Judge0: {e}", exc_info=True)
        return jsonify({
            "stdout": None,
            "stderr": "Internal server error during code execution.",
            "compile_output": None,
            "status": {"description": "Internal error"},
            "error": "Internal server error during code execution."
        }), 500
