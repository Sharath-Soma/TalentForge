# flask_server/course_recommender/service.py
import logging
import os
import re
from threading import Lock

logger = logging.getLogger(__name__)

# Path calculation for models in 'ML_prediction' directory (sibling to 'flask_server')
CURRENT_SERVICE_DIR = os.path.dirname(os.path.abspath(__file__)) # .../flask_server/course_recommender
FLASK_SERVER_DIR = os.path.dirname(CURRENT_SERVICE_DIR)          # .../flask_server
PROJECT_ROOT_DIR = os.path.dirname(FLASK_SERVER_DIR)             # .../ (project root)
MODEL_DIR_PATH = os.path.join(PROJECT_ROOT_DIR, 'ML prediction') # Corrected folder name

VECTORIZER_PATH = os.path.join(MODEL_DIR_PATH, 'tfidf_vectorizer.joblib')
COURSE_MATRIX_PATH = os.path.join(MODEL_DIR_PATH, 'course_tfidf_matrix.joblib')
COURSE_METADATA_PATH = os.path.join(MODEL_DIR_PATH, 'course_metadata.joblib')

_tfidf_vectorizer = None
_course_tfidf_matrix = None
_course_metadata_df = None
_model_loaded_successfully = False
_model_load_attempted = False
_model_load_error = None
_model_lock = Lock()

def _clean_text(text):
    if not isinstance(text, str): return ""
    text = text.lower()
    text = re.sub(r'[^\w\s]', '', text)
    return re.sub(r'\s+', ' ', text).strip()

def load_model_components():
    global _tfidf_vectorizer, _course_tfidf_matrix, _course_metadata_df
    global _model_loaded_successfully, _model_load_attempted, _model_load_error

    if _model_loaded_successfully:
        return True, "TF-IDF Course Model components loaded."

    with _model_lock:
        if _model_loaded_successfully:
            return True, "TF-IDF Course Model components loaded."
        if _model_load_attempted and not _model_loaded_successfully:
            return False, _model_load_error or "TF-IDF Course Model components not loaded."

        _model_load_attempted = True
        logger.info("Loading TF-IDF model components on first use from: %s", MODEL_DIR_PATH)

        try:
            if not os.path.isdir(MODEL_DIR_PATH):
                _model_load_error = f"TF-IDF Model directory not found: {MODEL_DIR_PATH}"
                logger.error(_model_load_error)
                _model_loaded_successfully = False
                return False, _model_load_error

            if not all(os.path.exists(p) for p in [VECTORIZER_PATH, COURSE_MATRIX_PATH, COURSE_METADATA_PATH]):
                _model_load_error = f"One or more TF-IDF model files missing from {MODEL_DIR_PATH}."
                logger.error(_model_load_error)
                _model_loaded_successfully = False
                return False, _model_load_error

            import joblib
            import pandas as pd
            from sklearn.feature_extraction.text import TfidfVectorizer

            _tfidf_vectorizer = joblib.load(VECTORIZER_PATH)
            _course_tfidf_matrix = joblib.load(COURSE_MATRIX_PATH)
            _course_metadata_df = joblib.load(COURSE_METADATA_PATH)

            # Keep explicit references so joblib deserialization has imported classes available.
            _ = (pd, TfidfVectorizer)

            _model_loaded_successfully = True
            _model_load_error = None
            logger.info("TF-IDF Course recommender model components loaded successfully.")
            return True, "TF-IDF Course Model components loaded."
        except Exception as exc:
            _tfidf_vectorizer = None
            _course_tfidf_matrix = None
            _course_metadata_df = None
            _model_loaded_successfully = False
            _model_load_error = str(exc)
            logger.error("Error loading TF-IDF model components: %s", exc, exc_info=True)
            return False, f"Error loading TF-IDF model components: {exc}"


def get_model_status(load_if_needed=False):
    if load_if_needed:
        loaded, message = load_model_components()
        return {"status": "UP" if loaded else "DOWN", "message": message}

    if _model_loaded_successfully:
        return {"status": "UP", "message": "TF-IDF Course Model components loaded."}
    if _model_load_attempted:
        return {"status": "DOWN", "message": _model_load_error or "TF-IDF Course Model components failed to load."}
    return {"status": "IDLE", "message": "TF-IDF Course Model not loaded yet. It will load on first use."}

def get_predictions(job_title, job_description, top_n=3):
    loaded, message = load_model_components()
    if not loaded:
        return [], message

    query_text = _clean_text(job_title + " " + job_description)
    if not query_text: return [], "Query text empty after cleaning."
    try:
        from sklearn.metrics.pairwise import cosine_similarity

        query_vector = _tfidf_vectorizer.transform([query_text])
        sim_scores = cosine_similarity(query_vector, _course_tfidf_matrix).flatten()
        indices = sim_scores.argsort()[-top_n:][::-1]
        recs = []
        for idx in indices:
            score = float(sim_scores[idx])
            if score > 0.01: # Threshold
                info = _course_metadata_df.iloc[idx]
                recs.append({
                    "id": f"tf_course_{idx}", "name": info.get('course_title'), "url": info.get('Course URL'),
                    "platform": "Coursera", "relevance": f"{score:.2%}",
                    "description_snippet": (info.get('course_description')[:150] + "...") if info.get('course_description') else "",
                    "skills_taught": info.get('course_skills')
                })
        msg = "Recommendations retrieved." if recs else "No suitable courses found."
        return recs, msg
    except Exception as e:
        logger.error(f"Error in TF-IDF get_predictions: {e}", exc_info=True)
        return [], f"Error predicting courses: {e}"
