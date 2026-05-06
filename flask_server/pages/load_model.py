from threading import Lock

_sbert_model_instance = None
_sbert_model_loaded = False
_sbert_load_attempted = False
_sbert_load_error = None
_sbert_lock = Lock()
_SBERT_MODEL_NAME = 'all-MiniLM-L6-v2'


def _load_bert_model_once(logger):
    global _sbert_model_instance, _sbert_model_loaded, _sbert_load_attempted, _sbert_load_error

    if _sbert_load_attempted:
        return _sbert_model_instance, _sbert_model_loaded

    with _sbert_lock:
        if _sbert_load_attempted:
            return _sbert_model_instance, _sbert_model_loaded

        _sbert_load_attempted = True
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError:
            _sbert_load_error = "`sentence_transformers` library not found. SBERT features unavailable."
            logger.warning(_sbert_load_error)
            return None, False

        try:
            logger.info("Loading Sentence Transformer model on first use: %s", _SBERT_MODEL_NAME)
            _sbert_model_instance = SentenceTransformer(_SBERT_MODEL_NAME)
            _sbert_model_loaded = True
            _sbert_load_error = None
            logger.info("Sentence Transformer model loaded successfully.")
        except Exception as exc:
            _sbert_model_instance = None
            _sbert_model_loaded = False
            _sbert_load_error = str(exc)
            logger.error("Failed to load Sentence Transformer model: %s", exc, exc_info=True)

    return _sbert_model_instance, _sbert_model_loaded


def get_bert_model(logger):
    return _load_bert_model_once(logger)


def get_bert_model_status():
    if _sbert_model_loaded:
        return {"status": "UP", "message": "SBERT model loaded."}
    if _sbert_load_attempted:
        return {"status": "DOWN", "message": _sbert_load_error or "SBERT model failed to load."}
    return {"status": "IDLE", "message": "SBERT model not loaded yet. It will load on first use."}


def load_bert_model(logger):
    return get_bert_model(logger)
