import json
import os

import requests
from dotenv import load_dotenv
from flask import current_app, has_app_context

OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
OPENAI_TIMEOUT = (5, 60)
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
ENV_PATH = os.path.join(BASE_DIR, ".env")
load_dotenv(ENV_PATH, override=False)
_OPENAI_KEY_STATUS_LOGGED = False


class OpenAIServiceError(RuntimeError):
    def __init__(self, log_message, public_message="AI service is temporarily unavailable.", status_code=500):
        super().__init__(log_message)
        self.log_message = log_message
        self.public_message = public_message
        self.status_code = status_code


def _get_model_name():
    if has_app_context():
        configured_model = current_app.config.get("OPENAI_MODEL")
        if configured_model:
            return str(configured_model).strip()
    return (os.getenv("OPENAI_MODEL") or "gpt-4.1-mini").strip()


def _normalize_api_key(value):
    if not value:
        return None
    return value.strip().strip('"').strip("'")


def _mask_api_key(value):
    if not value:
        return "missing"
    if len(value) <= 10:
        return "*" * len(value)
    return f"{value[:7]}...{value[-4:]}"


def _get_api_key():
    if has_app_context():
        configured_key = _normalize_api_key(current_app.config.get("OPENAI_API_KEY"))
        if configured_key:
            return configured_key
    return _normalize_api_key(os.getenv("OPENAI_API_KEY"))


def _log_key_status(logger, api_key):
    global _OPENAI_KEY_STATUS_LOGGED
    if _OPENAI_KEY_STATUS_LOGGED:
        return

    if api_key:
        logger.info("OpenAI API key available for requests: %s", _mask_api_key(api_key))
    else:
        logger.warning("OpenAI API key is not available when building request headers.")
    _OPENAI_KEY_STATUS_LOGGED = True


def _build_headers(logger):
    api_key = _get_api_key()
    _log_key_status(logger, api_key)
    if not api_key:
        raise OpenAIServiceError(
            "OPENAI_API_KEY is missing.",
            public_message="AI service is not configured on the server.",
            status_code=503,
        )
    if not api_key.startswith("sk-"):
        raise OpenAIServiceError(
            "OPENAI_API_KEY is present but malformed.",
            public_message="The configured OpenAI API key is malformed. Update OPENAI_API_KEY in flask_server/.env and restart the backend.",
            status_code=503,
        )

    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }


def _extract_api_error(response_data):
    error_block = response_data.get("error")
    if isinstance(error_block, dict):
        return {
            "message": error_block.get("message"),
            "type": error_block.get("type"),
            "code": error_block.get("code"),
        }
    return {"message": None, "type": None, "code": None}


def _build_public_error_message(status_code, response_data):
    error_details = _extract_api_error(response_data)
    error_code = error_details.get("code")
    error_type = error_details.get("type")
    error_message = error_details.get("message") or ""
    lowered_message = error_message.lower()

    if (
        status_code in (401, 403)
        or error_code in {"invalid_api_key", "authentication_error"}
        or (error_type in {"authentication_error", "invalid_request_error"} and "api key" in lowered_message)
    ):
        return "OpenAI rejected the configured API key. Update OPENAI_API_KEY in flask_server/.env, remove quotes or extra spaces if present, and restart the backend."

    if error_code == "insufficient_quota":
        return "The OpenAI project has no available quota right now. Check billing and usage, then try again."

    if status_code == 429:
        return "The AI service is busy right now. Please wait a moment and try again."

    if status_code == 400 and error_message:
        return f"OpenAI rejected the request: {error_message}"

    return "AI service is temporarily unavailable. Please try again shortly."


def _extract_output_text(response_data):
    if isinstance(response_data.get("output_text"), str) and response_data["output_text"].strip():
        return response_data["output_text"]

    for item in response_data.get("output", []):
        if item.get("type") != "message":
            continue
        for content_item in item.get("content", []):
            if content_item.get("type") == "output_text" and isinstance(content_item.get("text"), str):
                text = content_item["text"].strip()
                if text:
                    return text
    return None


def request_openai_text(prompt, logger, *, instructions, model=None, max_output_tokens=900):
    headers = _build_headers(logger)
    payload = {
        "model": model or _get_model_name(),
        "instructions": instructions,
        "input": prompt,
        "max_output_tokens": max_output_tokens,
    }

    try:
        response = requests.post(
            OPENAI_RESPONSES_URL,
            headers=headers,
            json=payload,
            timeout=OPENAI_TIMEOUT,
        )
    except requests.RequestException as exc:
        logger.error("OpenAI request failed before receiving a response: %s", exc, exc_info=True)
        raise OpenAIServiceError(
            f"OpenAI request failed: {exc}",
            public_message="AI service is temporarily unavailable. Please try again shortly.",
            status_code=503,
        ) from exc

    try:
        response_data = response.json()
    except ValueError:
        response_data = {"raw_response": response.text}

    if not response.ok:
        logger.error("OpenAI request failed: status=%s body=%s", response.status_code, response_data)
        public_message = _build_public_error_message(response.status_code, response_data)
        raise OpenAIServiceError(
            f"OpenAI returned status {response.status_code}: {response_data}",
            public_message=public_message,
            status_code=502 if response.status_code >= 500 else response.status_code,
        )

    output_text = _extract_output_text(response_data)
    if not output_text:
        logger.error("OpenAI response did not contain output text: %s", response_data)
        raise OpenAIServiceError(
            "OpenAI response did not include output text.",
            public_message="AI service returned an empty response. Please try again.",
            status_code=502,
        )

    return output_text


def request_openai_json(prompt, logger, *, instructions, schema_name, schema, model=None, max_output_tokens=1200):
    headers = _build_headers(logger)
    payload = {
        "model": model or _get_model_name(),
        "instructions": instructions,
        "input": prompt,
        "max_output_tokens": max_output_tokens,
        "text": {
            "format": {
                "type": "json_schema",
                "name": schema_name,
                "strict": True,
                "schema": schema,
            }
        },
    }

    try:
        response = requests.post(
            OPENAI_RESPONSES_URL,
            headers=headers,
            json=payload,
            timeout=OPENAI_TIMEOUT,
        )
    except requests.RequestException as exc:
        logger.error("OpenAI structured request failed before receiving a response: %s", exc, exc_info=True)
        raise OpenAIServiceError(
            f"OpenAI request failed: {exc}",
            public_message="AI service is temporarily unavailable. Please try again shortly.",
            status_code=503,
        ) from exc

    try:
        response_data = response.json()
    except ValueError:
        response_data = {"raw_response": response.text}

    if not response.ok:
        logger.error("OpenAI structured request failed: status=%s body=%s", response.status_code, response_data)
        public_message = _build_public_error_message(response.status_code, response_data)
        raise OpenAIServiceError(
            f"OpenAI returned status {response.status_code}: {response_data}",
            public_message=public_message,
            status_code=502 if response.status_code >= 500 else response.status_code,
        )

    output_text = _extract_output_text(response_data)
    if not output_text:
        logger.error("OpenAI structured response did not contain output text: %s", response_data)
        raise OpenAIServiceError(
            "OpenAI structured response did not include output text.",
            public_message="AI service returned an empty response. Please try again.",
            status_code=502,
        )

    try:
        return json.loads(output_text)
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse OpenAI JSON response: %s text=%s", exc, output_text, exc_info=True)
        raise OpenAIServiceError(
            f"Invalid JSON response from OpenAI: {exc}",
            public_message="AI service returned an unexpected response. Please try again.",
            status_code=502,
        ) from exc
