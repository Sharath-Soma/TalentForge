import React, { useEffect, useState, useTransition } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Check, Eye, EyeOff, Code2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_BASE_URL, createApiErrorMessage } from '../lib/api';
import './Auth.css';

const FEATURE_POINTS = ['Track every application in one pipeline', 'Optimize resumes with AI feedback', 'Practice interviews against target roles'];

const Login = () => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    void import('./Index');
  }, []);

  const handleChange = (event) => {
    setCredentials({ ...credentials, [event.target.name]: event.target.value });
    setError(''); // Clear error when user starts typing
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    // Validation
    if (!credentials.email || !credentials.password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const requestUrl = `${API_BASE_URL}/auth/login`;
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data?.token && data?.user) {
        login(data.user, data.token);
        startTransition(() => {
          navigate('/', { replace: true });
        });
      } else if (response.status === 401) {
        setError(data?.error || 'Invalid email or password. Please try again.');
      } else if (response.status >= 500) {
        setError('Server error. Please try again in a moment.');
      } else {
        setError(data?.error || `Login failed: ${response.status}`);
      }
    } catch (requestError) {
      console.error('Login request error:', {
        message: requestError.message,
        apiBaseUrl: API_BASE_URL,
      });
      
      // Provide helpful error message
      if (requestError.message.includes('Failed to fetch')) {
        setError(
          'Cannot reach the server. ' +
          (API_BASE_URL 
            ? `Trying: ${API_BASE_URL}\n\nMake sure the backend is running.` 
            : 'Backend may be offline. Check that Flask server is running on http://localhost:5002')
        );
      } else {
        setError(createApiErrorMessage(requestError, 'Network error: Could not complete login.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <motion.section 
        className="auth-panel"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="auth-panel__copy">
          <div className="auth-panel__brand">
            <div className="auth-brand-icon">
              <Code2 size={22} />
            </div>
            <span className="auth-brand-name">TalentForge</span>
          </div>

          <span className="auth-panel__eyebrow">Career acceleration suite</span>
          <h1 className="auth-panel__title">Move from scattered tools to one polished job search workspace.</h1>
          <p className="auth-panel__text">
            TalentForge brings search, resume optimization, interview prep, and tracking together in a single SaaS-style workflow.
          </p>
        </div>

        <div className="auth-panel__stats">
          <div className="auth-stat">
            <strong>1</strong>
            <span>Unified workspace</span>
          </div>
          <div className="auth-stat">
            <strong>3</strong>
            <span>AI copilots</span>
          </div>
          <div className="auth-stat">
            <strong>24/7</strong>
            <span>Career support</span>
          </div>
        </div>

        <div className="auth-panel__list">
          {FEATURE_POINTS.map((point) => (
            <div key={point} className="auth-panel__item">
              <span className="auth-panel__bullet">
                <Check size={14} />
              </span>
              <span>{point}</span>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section 
        className="auth-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="auth-card__top">
          <div className="auth-branding">
            <div className="auth-brand-icon">
              <Code2 size={20} />
            </div>
            <span className="auth-brand-name">Welcome back</span>
          </div>
        </div>

        <div>
          <h2 className="auth-heading">Sign in to your workspace</h2>
          <p className="auth-subtitle">Pick up where you left off and keep your job search moving.</p>
        </div>

        {error ? (
          <div className="alert alert--error" role="alert">
            {error.split('\n').map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        ) : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              name="email"
              placeholder="you@example.com"
              value={credentials.email}
              onChange={handleChange}
              required
              disabled={loading || isPending}
            />
          </div>

          <div className="field-group">
            <label htmlFor="login-password">Password</label>
            <div className="input-group">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Enter your password"
                value={credentials.password}
                onChange={handleChange}
                required
                disabled={loading || isPending}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                tabIndex={-1}
                disabled={loading || isPending}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary auth-submit-btn" disabled={loading || isPending}>
            {loading ? (
              <>
                <span className="button-spinner" />
                Signing in...
              </>
            ) : isPending ? (
              <>
                <span className="button-spinner" />
                Opening workspace...
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <div className="auth-divider">or continue with</div>

        <a href={`${API_BASE_URL}/auth/google/login`} className="google-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </a>

        <div className="auth-footer">
          Do not have an account? <Link to="/signup">Create one</Link>
        </div>
      </motion.section>
    </div>
  );
};

export default Login;
