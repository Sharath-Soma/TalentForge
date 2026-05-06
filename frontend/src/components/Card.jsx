import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, Bookmark, MapPin } from 'lucide-react';
import { useToastContext } from '../context/ToastContext';
import { calculateMatchScore, getJobTagsForMatch } from '../utils/matchScore';
import './Card.css';

const SAVED_KEY = 'talentforge_saved_jobs';

const idsMatch = (a, b) => a === b || String(a) === String(b);

const formatSalary = (min, max) => {
  if (!max && !min) return '$70K - $120K';
  const formatValue = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };
  if (min && max) return `${formatValue(min)} - ${formatValue(max)}`;
  if (max) return `Up to ${formatValue(max)}`;
  return `From ${formatValue(min)}`;
};

const excerpt = (text) => {
  if (!text) {
    return 'Explore responsibilities, requirements, and application details for this role.';
  }

  return text.replace(/\s+/g, ' ').trim().slice(0, 140) + (text.length > 140 ? '...' : '');
};

const toneForMatch = (score) => {
  if (score == null) return '';
  if (score >= 70) return 'is-good';
  if (score >= 40) return 'is-mid';
  return 'is-low';
};

const Card = ({ job, isLoading = false }) => {
  const navigate = useNavigate();
  const { addToast } = useToastContext();
  const [isSaved, setIsSaved] = useState(() => {
    if (job?.id == null) return false;
    try {
      const saved = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
      return Array.isArray(saved) && saved.some((savedJob) => idsMatch(savedJob.id, job.id));
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (job?.id == null) return;
    try {
      const saved = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
      setIsSaved(Array.isArray(saved) && saved.some((savedJob) => idsMatch(savedJob.id, job.id)));
    } catch {
      setIsSaved(false);
    }
  }, [job?.id]);

  const matchScore = useMemo(() => {
    try {
      if (!job?.id) return null;
      const rawProfile = localStorage.getItem('talentforge_profile') || '{}';
      const profile = JSON.parse(rawProfile);
      const userSkills = Array.isArray(profile?.skills) ? profile.skills : [];
      if (!userSkills.length) return null;
      const jobTags = getJobTagsForMatch(job);
      return calculateMatchScore(jobTags, userSkills);
    } catch {
      return null;
    }
  }, [job]);

  if (isLoading) return <SkeletonCard />;
  if (!job) return null;

  const tags = [
    job.category?.label,
    job.contract_time === 'full_time' ? 'Full-time' : null,
    (job.location?.display_name || '').toLowerCase().includes('remote') ? 'Remote' : null,
    ...getJobTagsForMatch(job).slice(0, 2),
  ]
    .filter(Boolean)
    .slice(0, 3);

  const handleDetails = (event) => {
    event.stopPropagation();
    navigate(`/job/${job.id}`, { state: { jobDetails: job } });
  };

  const handleSave = (event) => {
    event.stopPropagation();
    event.preventDefault();

    let saved = [];
    try {
      saved = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
      if (!Array.isArray(saved)) saved = [];
    } catch {
      saved = [];
    }

    if (isSaved) {
      const updated = saved.filter((savedJob) => !idsMatch(savedJob.id, job.id));
      localStorage.setItem(SAVED_KEY, JSON.stringify(updated));
      setIsSaved(false);
      addToast('Position removed from saved jobs', 'warning');
    } else {
      saved.push({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        savedAt: new Date().toISOString(),
      });
      localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
      setIsSaved(true);
      addToast('Position saved successfully', 'success');
    }

    window.dispatchEvent(new Event('talentforge-saved-jobs-changed'));
  };

  const handleApply = (event) => {
    event.stopPropagation();
    event.preventDefault();
    if (job.apply_url || job.redirect_url) {
      window.open(job.apply_url || job.redirect_url, '_blank');
    }
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.26, ease: 'easeOut' }}
      className="job-card"
      onClick={handleDetails}
    >
      <div className="job-card__header">
        <div className="job-card__company">
          <span className="job-card__avatar">
            {job.company?.display_name?.charAt(0)?.toUpperCase() || 'J'}
          </span>
          <div className="job-card__company-meta">
            <span className="job-card__company-name">{job.company?.display_name || 'Unknown company'}</span>
            <span className="job-card__date">
              {job.created
                ? new Date(job.created).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                : 'Recently posted'}
            </span>
          </div>
        </div>

        <div className="job-card__header-actions">
          {matchScore !== null ? (
            <span className={`match-badge ${toneForMatch(matchScore)}`}>{matchScore}% match</span>
          ) : null}
          <button
            type="button"
            className={`bookmark-btn ${isSaved ? 'is-saved' : ''}`}
            onClick={handleSave}
            title={isSaved ? 'Remove from saved' : 'Save position'}
            aria-label={isSaved ? 'Remove from saved' : 'Save position'}
          >
            <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      <div className="job-card__body">
        <div className="job-card__title-row">
          <h3 className="job-card__title">{job.title}</h3>
          <ArrowUpRight size={16} className="job-card__jump" />
        </div>
        <p className="job-card__excerpt">{excerpt(job.description || job.job_description)}</p>

        <div className="job-card__tags">
          {tags.map((tag) => (
            <span key={tag} className="job-card__tag">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="job-card__footer">
        <div className="job-card__meta">
          <span className="job-card__salary">{formatSalary(job.salary_min, job.salary_max)}</span>
          <span className="job-card__location">
            <MapPin size={14} />
            {job.location?.display_name?.split(',')[0] || 'Remote'}
          </span>
        </div>

        <div className="job-card__actions">
          <button type="button" className="btn-ghost" onClick={handleDetails}>
            Details
          </button>
          <button type="button" className="btn-primary" onClick={handleApply}>
            Apply now
          </button>
        </div>
      </div>
    </motion.article>
  );
};

const SkeletonCard = () => (
  <div className="job-card skeleton">
    <div className="job-card__header">
      <div className="job-card__company">
        <span className="job-card__avatar skeleton-block" />
        <div className="job-card__company-meta">
          <div className="job-card__skeleton-line skeleton-block" />
          <div className="job-card__skeleton-line job-card__skeleton-line--short skeleton-block" />
        </div>
      </div>
    </div>
    <div className="stack-sm">
      <div className="job-card__skeleton-line job-card__skeleton-line--wide skeleton-block" />
      <div className="job-card__skeleton-line skeleton-block" />
      <div className="job-card__skeleton-line job-card__skeleton-line--short skeleton-block" />
    </div>
  </div>
);

export default React.memo(Card);
