import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, ExternalLink, GraduationCap } from 'lucide-react';
import { useJobRole } from '../context/JobRoleContext';
import { API_BASE_URL } from '../lib/api';
import './Course.css';

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

const levelClass = (level) => {
  const normalized = String(level || '').toLowerCase();
  if (normalized === 'beginner') return 'course-level--beginner';
  if (normalized === 'intermediate') return 'course-level--intermediate';
  if (normalized === 'advanced') return 'course-level--advanced';
  return '';
};

const Course = () => {
  const { jobRole, setActiveJob } = useJobRole();
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [availableJobs, setAvailableJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

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

    const generateCourses = async () => {
      setLoading(true);
      setLoadError(null);
      setCourses([]);

      try {
        const response = await fetch(`${API_BASE_URL}/api/recommend_courses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ job_role: jobRole }),
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load course recommendations.');
        }

        const parsed = Array.isArray(data?.courses) ? data.courses : [];
        const normalized = parsed
          .slice(0, 6)
          .filter((course) => course && typeof course.title === 'string' && typeof course.platform === 'string');
        setCourses(normalized);
      } catch (error) {
        console.error(error);
        setLoadError(error.message || 'Failed to load course recommendations.');
      } finally {
        setLoading(false);
      }
    };

    generateCourses();
  }, [jobRole]);

  const searchUrl = (course) => `https://www.google.com/search?q=${encodeURIComponent(`${course.title} ${course.platform}`)}`;

  if (!jobRole) {
    return (
      <div className="page-shell">
        <div className="page-header">
          <div className="page-header__title-group">
            <span className="page-header__eyebrow">Course Recommendations</span>
            <h2>Select a role and map out the fastest learning path toward it.</h2>
            <p className="page-header__subtitle">
              Use the same role context from your dashboard to generate six focused learning recommendations.
            </p>
          </div>
        </div>

        <section className="surface-card course-picker">
          <div className="inline-group">
            <span className="course-picker__icon">
              <GraduationCap size={20} />
            </span>
            <div>
              <h3>Choose a role to get courses</h3>
              <p className="text-muted">Pull in a job from the dashboard to personalize your learning plan.</p>
            </div>
          </div>

          {loadingJobs ? (
            <div className="selection-list">
              {[1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="selection-item skeleton-block course-picker__skeleton" />
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
                  {selectedJobId === job.id ? <Check size={16} className="course-picker__check" /> : null}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            className="btn-primary course-picker__cta"
            disabled={!selectedJobId}
            onClick={() => {
              const selected = availableJobs.find((job) => job.id === selectedJobId);
              if (selected) {
                setActiveJob(selected);
              }
            }}
          >
            Get course recommendations
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
          <span className="page-header__eyebrow">Course Recommendations</span>
          <h2>Upskill with recommendations aligned to the role you want next.</h2>
          <p className="page-header__subtitle">Learning plan for: {jobRole}</p>
        </div>
      </div>

      {loadError ? <div className="alert alert--error">{loadError}</div> : null}

      {loading ? (
        <div className="recommendation-grid">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className="surface-card course-card">
              <div className="skeleton-block course-card__line course-card__line--title" />
              <div className="skeleton-block course-card__line course-card__line--meta" />
              <div className="skeleton-block course-card__block" />
            </div>
          ))}
        </div>
      ) : null}

      {!loading && courses.length > 0 ? (
        <div className="recommendation-grid">
          {courses.map((course, index) => (
            <article key={index} className="surface-card course-card">
              <div className="course-card__head">
                <span className="badge">{course.platform}</span>
                {course.level ? <span className={`course-level ${levelClass(course.level)}`}>{course.level}</span> : null}
              </div>
              <h3>{course.title}</h3>
              <p>{course.description}</p>
              <a href={searchUrl(course)} target="_blank" rel="noopener noreferrer" className="course-card__link">
                Find this course
                <ExternalLink size={14} />
              </a>
            </article>
          ))}
        </div>
      ) : null}

      {!loading && !loadError && courses.length === 0 && jobRole ? <p className="text-muted">No courses were returned. Try again later.</p> : null}
    </div>
  );
};

export default Course;
