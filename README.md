Deployment Guide

Overview
- Frontend: deploy to Vercel (static SPA built with Vite).
- Backend: deploy to Render / Heroku / similar (Flask + Gunicorn).

Frontend (Vercel)
1. In Vercel project settings, set an Environment Variable:
   - `VITE_API_URL` = `https://your-backend-url`
2. Build command: `npm run build` (already set in project)
3. Output directory: `dist`
4. `vercel.json` is included to rewrite all routes to `index.html` for SPA routing.

Backend (Render)
1. Create a new Web Service (Docker or Python/Flask).
2. Set the following Environment Variables in your service:
   - `FLASK_APP_SECRET_KEY` (required)
   - `DATABASE_URL` (required)
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (if using Google OAuth)
   - `FRONTEND_URL` = `https://your-frontend-url` (used for CORS)
   - `OPENAI_API_KEY` (if using OpenAI features)
   - Optional: `JUDGE0_URL` (if you host a Judge0-compatible service for the Code Lab)
3. Start command (Render): `gunicorn -w 4 -b 0.0.0.0:$PORT flask_server.app:app`
   - A `Procfile` is included in `flask_server/Procfile`.
4. Ensure `requirements.txt` includes `gunicorn` (already present).

Important notes
- Do NOT commit `.env` files with secrets. Use the provided `frontend/.env.example` and `flask_server/.env.example` as templates.
- CORS: The backend reads `FRONTEND_URL` and configures CORS origins accordingly. Set it to your deployed frontend domain.
- Code Lab / Judge0: The compiler endpoint is opt-in. If `JUDGE0_URL` is not set the endpoint returns 503 with a safe message.

Order of setup
1. Deploy backend first and configure environment variables.
2. Set `VITE_API_URL` in Vercel to point to backend.
3. Deploy frontend to Vercel.
4. Test flows: login/signup, Google OAuth redirect, navigation refreshes, API calls.

Local testing
- Frontend build locally: `cd frontend && npm run build`
- Backend run locally (example):

```bash
# from project root
# Use a virtualenv and install requirements
python -m venv venv
venv\Scripts\activate
pip install -r flask_server/requirements.txt
# set env vars or copy flask_server/.env.example -> flask_server/.env (DO NOT commit)
cd flask_server
python app.py
```

Security
- Secrets should be stored in the host's environment configuration.
- If secrets were committed previously, consider rotating them and purging git history.
