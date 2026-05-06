import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Building2, ExternalLink, Bookmark, Mic2, ScanSearch, ChevronRight, GraduationCap, FileText } from 'lucide-react';
import { useJobRole } from '../context/JobRoleContext';
import Loader from '../components/Loader';
import CoverLetterModal from '../components/CoverLetterModal';
import { API_BASE_URL } from '../lib/api';
import './CheckJobPage.css';

const CheckJobPage = () => {
  const { jobId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { setActiveJob } = useJobRole();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [showCoverLetter, setShowCoverLetter] = useState(false);

  const jobDescription =
    job?.description ||
    job?.job_description ||
    job?.full_description ||
    job?.details ||
    job?.body ||
    job?.desc ||
    job?.__CLASS__?.description ||
    '';

  useEffect(() => {
    const fetchJob = async () => {
      const startTime = Date.now();

      if (location.state?.jobDetails) {
        setJob(location.state.jobDetails);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`);
        if (!response.ok) throw new Error('Job not found');
        const data = await response.json();

        const elapsedTime = Date.now() - startTime;
        if (elapsedTime < 500) {
          await new Promise((resolve) => setTimeout(resolve, 500 - elapsedTime));
        }

        setJob(data);
      } catch (fetchError) {
        setError(fetchError.message);
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [location.state, jobId]);

  useEffect(() => {
    if (!job?.id) {
      setIsSaved(false);
      return;
    }
    const saved = JSON.parse(localStorage.getItem('talentforge_saved_jobs') || '[]');
    setIsSaved(saved.some((savedJob) => savedJob.id === job.id));
  }, [job]);

  const handleApply = () => {
    if (job?.apply_url || job?.redirect_url) {
      window.open(job.apply_url || job.redirect_url, '_blank');
    } else {
      setError('Application link not available for this position.');
    }
  };

  const goToInterview = () => {
    flushSync(() => setActiveJob(job));
    navigate('/ai-interview');
  };

  const goToAts = () => {
    flushSync(() => setActiveJob(job));
    navigate('/ats-agent');
  };

  const goToCoursePredictor = () => {
    flushSync(() => setActiveJob(job));
    navigate('/course-predictor');
  };

  const handleSavePosition = () => {
    if (!job?.id) return;
    const saved = JSON.parse(localStorage.getItem('talentforge_saved_jobs') || '[]');

    if (isSaved) {
      const updated = saved.filter((savedJob) => savedJob.id !== job.id);
      localStorage.setItem('talentforge_saved_jobs', JSON.stringify(updated));
      setIsSaved(false);
    } else {
      saved.push({
        id: job.id,
        title: job.title,
        company: job.company?.display_name || '',
        location: job.location?.display_name || '',
        savedAt: new Date().toISOString(),
      });
      localStorage.setItem('talentforge_saved_jobs', JSON.stringify(saved));
      setIsSaved(true);
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <div className="empty-state-card">
          <Loader text="Loading job details..." />
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="page-shell">
        <div className="empty-state-card">
          <h3>Job details not found</h3>
          <p>{error || "We could not load the details for this position."}</p>
          <button type="button" className="btn-primary" onClick={() => navigate('/')}>
            Back to listings
          </button>
        </div>
      </div>
    );
  }

  const formatSalary = (min, max) => {
    if (!max && !min) return 'Competitive';
    const formatValue = (value) => {
      if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
      return `$${value}`;
    };
    if (min && max) return `${formatValue(min)} - ${formatValue(max)}`;
    return 'Competitive';
  };

  const jobForCoverLetter = job
    ? {
        ...job,
        tags: Array.isArray(job.tags) && job.tags.length ? job.tags : Array.isArray(job.skills) && job.skills.length ? job.skills : job.category?.label ? [job.category.label] : [],
      }
    : null;

  return (
    <div className="page-shell">
      {showCoverLetter && jobForCoverLetter ? <CoverLetterModal job={jobForCoverLetter} onClose={() => setShowCoverLetter(false)} /> : null}

      <button type="button" className="btn-ghost jd-back" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} />
        Back to jobs
      </button>

      <section className="surface-card hero-card jd-hero">
        <div className="jd-hero__content">
          <span className="page-header__eyebrow">Opportunity spotlight</span>
          <h2>{job.title}</h2>
          <div className="jd-meta-row">
            <span className="metric-inline">
              <Building2 size={14} />
              {job.company?.display_name || 'Company'}
            </span>
            <span className="metric-inline">
              <MapPin size={14} />
              {job.location?.display_name || 'Remote'}
            </span>
            <span className="metric-inline">
              <Calendar size={14} />
              Posted {job.created ? new Date(job.created).toLocaleDateString() : 'recently'}
            </span>
          </div>
        </div>

        <div className="jd-hero__actions">
          <button type="button" className="btn-primary" onClick={handleApply}>
            Apply now
            <ExternalLink size={16} />
          </button>
          <button type="button" className={`btn-secondary ${isSaved ? 'jd-save-active' : ''}`} onClick={handleSavePosition}>
            <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />
            {isSaved ? 'Saved' : 'Save position'}
          </button>
        </div>
      </section>

      <div className="jd-grid">
        <div className="jd-main-col">
          <section className="surface-card jd-section-card">
            <div className="jd-section-card__head">
              <h3>Job description</h3>
              {job.url ? (
                <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                  <ExternalLink size={14} />
                  Full listing
                </a>
              ) : null}
            </div>
            <div className="jd-description">{jobDescription || 'No description available for this position.'}</div>
          </section>

          <section className="surface-card jd-section-card">
            <h3>Required skills</h3>
            <div className="jd-skills-row">
              {(job.skills || ['React', 'JavaScript', 'Node.js', 'PostgreSQL']).map((skill) => (
                <span key={skill} className="jd-skill-chip">
                  {skill}
                </span>
              ))}
            </div>
          </section>

          <section className="surface-card jd-section-card">
            <h3>Key details</h3>
            <div className="jd-details-grid">
              <div className="jd-detail-item">
                <span className="jd-detail-label">Experience level</span>
                <strong>{job.experience || 'Entry / Mid level'}</strong>
              </div>
              <div className="jd-detail-item">
                <span className="jd-detail-label">Job type</span>
                <strong>{job.contract_time === 'full_time' ? 'Full time' : 'Contract'}</strong>
              </div>
              <div className="jd-detail-item">
                <span className="jd-detail-label">Estimated salary</span>
                <strong>{formatSalary(job.salary_min, job.salary_max)}</strong>
              </div>
            </div>
          </section>
        </div>

        <aside className="jd-side-col">
          <section className="surface-card jd-action-panel">
            <div className="jd-action-panel__head">
              <span className="badge">AI tools</span>
              <p>Use the role context instantly across the rest of the workspace.</p>
            </div>

            <button type="button" className="jd-ai-tool-btn" onClick={() => setShowCoverLetter(true)}>
              <span className="jd-ai-tool-btn__icon">
                <FileText size={18} />
              </span>
              <span>Generate cover letter</span>
              <ChevronRight size={16} />
            </button>

            <button type="button" className="jd-ai-tool-btn" onClick={goToInterview}>
              <span className="jd-ai-tool-btn__icon">
                <Mic2 size={18} />
              </span>
              <span>Practice interview</span>
              <ChevronRight size={16} />
            </button>

            <button type="button" className="jd-ai-tool-btn" onClick={goToAts}>
              <span className="jd-ai-tool-btn__icon">
                <ScanSearch size={18} />
              </span>
              <span>Analyze resume match</span>
              <ChevronRight size={16} />
            </button>

            <button type="button" className="jd-ai-tool-btn" onClick={goToCoursePredictor}>
              <span className="jd-ai-tool-btn__icon">
                <GraduationCap size={18} />
              </span>
              <span>Find supporting courses</span>
              <ChevronRight size={16} />
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default CheckJobPage;
