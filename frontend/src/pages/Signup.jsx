import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Check, Code2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '../lib/api';
import './Auth.css';

const Signup = () => {
  const [userData, setUserData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    void import('./Index');
  }, []);

  const handleChange = (event) => {
    setUserData({ ...userData, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      const data = await response.json();

      if (response.ok) {
        navigate('/login');
      } else {
        setError(data.error || 'Signup failed');
      }
    } catch {
      setError('Something went wrong while creating your account.');
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

          <span className="auth-panel__eyebrow">Built for focused job seekers</span>
          <h1 className="auth-panel__title">Set up a clean, modern career command center in minutes.</h1>
          <p className="auth-panel__text">
            Create your account to unlock smart job discovery, resume scoring, course recommendations, and guided interview practice.
          </p>
        </div>

        <div className="auth-panel__list">
          {['Store your candidate profile once', 'Surface better-fit roles faster', 'Keep every action inside one workflow'].map((item) => (
            <div key={item} className="auth-panel__item">
              <span className="auth-panel__bullet">
                <Check size={14} />
              </span>
              <span>{item}</span>
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
            <span className="auth-brand-name">Create account</span>
          </div>
        </div>

        <div>
          <h2 className="auth-heading">Start your TalentForge workspace</h2>
          <p className="auth-subtitle">Use one account across your dashboard, tracker, and AI tools.</p>
        </div>

        {error ? <div className="alert alert--error">{error}</div> : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="signup-name">Full name</label>
            <input id="signup-name" type="text" name="name" placeholder="Alex Morgan" value={userData.name} onChange={handleChange} required />
          </div>

          <div className="field-group">
            <label htmlFor="signup-email">Email address</label>
            <input id="signup-email" type="email" name="email" placeholder="you@example.com" value={userData.email} onChange={handleChange} required />
          </div>

          <div className="field-group">
            <label htmlFor="signup-password">Password</label>
            <input id="signup-password" type="password" name="password" placeholder="Create a secure password" value={userData.password} onChange={handleChange} required />
          </div>

          <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
            {loading ? (
              <>
                <span className="button-spinner" />
                Creating account...
              </>
            ) : (
              <>
                Create account
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </motion.section>
    </div>
  );
};

export default Signup;
