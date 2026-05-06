import { memo, useCallback } from 'react';
import { Bookmark, MapPin, Trash2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './SavedJobsPanel.css';

function SavedJobsPanel({ savedJobs, onUnsave }) {
  const navigate = useNavigate();
  const handleViewDetails = useCallback((jobId) => navigate(`/job/${jobId}`), [navigate]);

  if (savedJobs.length === 0) {
    return (
      <div className="saved-empty-state">
        <span className="saved-empty-state__icon">
          <Bookmark size={34} />
        </span>
        <h3>No saved jobs yet</h3>
        <p>Bookmark promising roles from the dashboard to keep them close while you compare and apply.</p>
      </div>
    );
  }

  return (
    <div className="saved-jobs-grid">
      {savedJobs.map((job) => (
        <article key={job.id} className="saved-job-card">
          <div className="saved-job-header">
            <div className="company-avatar">
              {(typeof job.company === 'string' ? job.company : job.company?.display_name || '?').charAt(0).toUpperCase()}
            </div>
            <div className="saved-job-meta">
              <span className="saved-job-company">
                {typeof job.company === 'string' ? job.company : job.company?.display_name || 'Company'}
              </span>
              <span className="saved-job-date">
                Saved {job.savedAt ? new Date(job.savedAt).toLocaleDateString() : 'recently'}
              </span>
            </div>
            <button type="button" className="unsave-btn" onClick={() => onUnsave(job.id)} title="Remove from saved">
              <Trash2 size={14} />
            </button>
          </div>

          <h3 className="saved-job-title">{job.title}</h3>

          {job.location ? (
            <div className="saved-job-location">
              <MapPin size={14} />
              {typeof job.location === 'string' ? job.location : job.location?.display_name}
            </div>
          ) : null}

          <button type="button" className="btn-ghost saved-job-view" onClick={() => handleViewDetails(job.id)}>
            View details
            <ArrowRight size={14} />
          </button>
        </article>
      ))}
    </div>
  );
}

export default memo(SavedJobsPanel);
