import React, { useEffect, useState } from 'react';
import { ArrowRight, Briefcase, Check, HelpCircle } from 'lucide-react';
import { useJobRole } from '../context/JobRoleContext';
import { useToastContext } from '../context/ToastContext';
import { API_BASE_URL } from '../lib/api';
import './Practice.css';

const MAX_CHARS = 500;
const DASHBOARD_JOBS_CACHE_KEY = 'talentforge_dashboard_jobs_cache';

async function fetchDashboardJobs() {
  const cached = sessionStorage.getItem(DASHBOARD_JOBS_CACHE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch (error) {
      console.error(error);
    }
  }

  const queryParams = new URLSearchParams({
    page: 1,
    limit: 25,
    keywords: 'software engineer',
  });
  const response = await fetch(`${API_BASE_URL}/api/fetch_jobs?${queryParams.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch jobs.');
  const data = await response.json();
  const jobs = Array.isArray(data.jobs) ? data.jobs : [];
  sessionStorage.setItem(DASHBOARD_JOBS_CACHE_KEY, JSON.stringify(jobs));
  return jobs;
}

const Practice = () => {
  const { activeJob, jobRole, setActiveJob } = useJobRole();
  const { addToast } = useToastContext();
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [availableJobs, setAvailableJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  useEffect(() => {
    if (jobRole) return;
    const loadJobs = async () => {
      setLoadingJobs(true);
      try {
        const jobs = await fetchDashboardJobs();
        setAvailableJobs(jobs);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingJobs(false);
      }
    };
    loadJobs();
  }, [jobRole]);

  useEffect(() => {
    if (!jobRole) return;

    const generateQuestions = async () => {
      setLoading(true);
      setLoadError(null);
      setQuestions([]);
      setAnswers({});
      setFeedback(null);

      try {
        const response = await fetch(`${API_BASE_URL}/api/generate_interview_questions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            job_role: jobRole,
            context_keywords: [
              activeJob?.company?.display_name || '',
              activeJob?.category?.label || '',
              ...(Array.isArray(activeJob?.tags) ? activeJob.tags : []),
            ]
              .filter(Boolean)
              .join(', '),
          }),
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to generate questions.');
        }

        const parsed = Array.isArray(data?.questions) ? data.questions : [];
        if (!parsed.length) {
          throw new Error('No interview questions were returned.');
        }

        setQuestions(parsed.slice(0, 5).filter((question) => typeof question === 'string' && question.trim().length));
      } catch (error) {
        console.error(error);
        setLoadError(error.message || 'Failed to generate questions.');
      } finally {
        setLoading(false);
      }
    };

    generateQuestions();
  }, [API_BASE_URL, activeJob, jobRole]);

  const handleAnswer = (index, value) => {
    if (value.length <= MAX_CHARS) {
      setAnswers({ ...answers, [index]: value });
    }
  };

  const handleSubmitAnswers = async () => {
    if (!questions.length || !jobRole) return;
    setLoadingFeedback(true);
    try {
      const qa = questions.map((question, index) => ({
        question,
        answer: answers[index] || '(No answer provided)',
      }));

      const response = await fetch(`${API_BASE_URL}/api/evaluate_answers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_role: jobRole,
          job_details: activeJob || { title: jobRole },
          questions_and_answers: qa,
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to evaluate answers.');
      }

      const parsed = Array.isArray(data?.feedback) ? data.feedback : [];
      if (parsed.length < questions.length) {
        throw new Error('Invalid feedback format');
      }
      setFeedback(parsed);
    } catch (error) {
      console.error(error);
      addToast(error.message || 'Failed to generate feedback', 'error');
    } finally {
      setLoadingFeedback(false);
    }
  };

  const answeredCount = Object.values(answers).filter((answer) => answer && answer.trim().length > 0).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  if (!jobRole) {
    return (
      <div className="page-shell">
        <div className="page-header">
          <div className="page-header__title-group">
            <span className="page-header__eyebrow">Interview Practice</span>
            <h2>Choose a role and generate a role-aware interview session.</h2>
            <p className="page-header__subtitle">
              Pull from live jobs, then practice with a set of targeted questions designed for that exact role context.
            </p>
          </div>
        </div>

        <section className="surface-card practice-picker">
          <div className="practice-picker__head">
            <div className="inline-group">
              <span className="practice-picker__icon">
                <Briefcase size={20} />
              </span>
              <div>
                <h3>Choose a role to practice</h3>
                <p className="text-muted">Pick a role from the dashboard feed to generate smarter prompts.</p>
              </div>
            </div>
          </div>

          {loadingJobs ? (
            <div className="selection-list">
              {[1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="selection-item skeleton-block practice-picker__skeleton" />
              ))}
            </div>
          ) : (
            <div className="selection-list">
              {availableJobs.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  className={`selection-item ${selectedJobId === job.id ? 'is-selected' : ''}`}
                  onClick={() => setSelectedJobId(job.id)}
                >
                  <span className="selection-item__dot" />
                  <div className="selection-item__meta">
                    <span className="selection-item__title">{job.title}</span>
                    <span className="selection-item__subtitle">
                      {job.company?.display_name || 'Unknown company'} | {job.location?.display_name || 'Remote'}
                    </span>
                  </div>
                  {selectedJobId === job.id ? <Check size={16} className="practice-picker__check" /> : null}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            className="btn-primary practice-picker__cta"
            disabled={!selectedJobId}
            onClick={() => {
              const selected = availableJobs.find((job) => job.id === selectedJobId);
              if (selected) {
                setActiveJob(selected);
              }
            }}
          >
            Generate interview questions
            <ArrowRight size={16} />
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <div className="page-header__title-group">
          <span className="page-header__eyebrow">Interview Practice</span>
          <h2>Practice against the role you selected, not a generic prompt list.</h2>
          <p className="page-header__subtitle">Role: {jobRole}</p>
        </div>
      </div>

      {!loading && questions.length > 0 ? (
        <div className="practice-progress-wrap">
          <div className="progress-bar">
            <span style={{ width: `${progress}%` }} />
          </div>
          <span className="text-muted">{answeredCount} of {questions.length} answers drafted</span>
        </div>
      ) : null}

      {loadError ? <div className="alert alert--error">{loadError}</div> : null}

      {loading ? (
        <div className="practice-skeleton-stack">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="practice-question-card skeleton">
              <div className="skeleton-block practice-question-card__badge" />
              <div className="skeleton-block practice-question-card__line practice-question-card__line--wide" />
              <div className="skeleton-block practice-question-card__line" />
              <div className="skeleton-block practice-question-card__textarea" />
            </div>
          ))}
        </div>
      ) : null}

      {!loading && questions.length > 0 ? (
        <div className="practice-question-list">
          {questions.map((question, index) => (
            <article key={index} className="practice-question-card">
              <div className="practice-question-card__head">
                <span className="practice-q-badge">Q{index + 1}</span>
                <h3>{question}</h3>
              </div>

              <div className="practice-answer-wrap">
                <textarea
                  rows="5"
                  placeholder="Draft your answer here..."
                  value={answers[index] || ''}
                  onChange={(event) => handleAnswer(index, event.target.value)}
                />
                <span className="practice-char-count">
                  {(answers[index] || '').length} / {MAX_CHARS}
                </span>
              </div>

              {feedback && feedback[index] ? (
                <div className="answer-feedback">
                  <div className="feedback-header">
                    <span className={`feedback-score feedback-score--${feedback[index].score >= 7 ? 'good' : feedback[index].score >= 4 ? 'mid' : 'low'}`}>
                      {feedback[index].score}/10
                    </span>
                    <span className="feedback-rating">{feedback[index].rating}</span>
                  </div>
                  <p className="feedback-text">{feedback[index].feedback}</p>
                  <div className="feedback-tip">
                    <HelpCircle size={13} />
                    <span>{feedback[index].tip}</span>
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {!loading && !loadError && questions.length === 0 && jobRole ? <p className="text-muted">No questions were returned. Try again later.</p> : null}

      {!loading && questions.length > 0 ? (
        <div className="practice-footer">
          <button type="button" className="btn-primary" onClick={handleSubmitAnswers} disabled={loadingFeedback}>
            {loadingFeedback ? 'Analyzing answers...' : 'Submit and get feedback'}
            {!loadingFeedback ? <ArrowRight size={16} /> : null}
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default Practice;
