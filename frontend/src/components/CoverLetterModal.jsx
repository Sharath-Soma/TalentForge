import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, Copy } from 'lucide-react';
import { useToastContext } from '../context/ToastContext';
import { API_BASE_URL } from '../lib/api';
import './CoverLetterModal.css';

function normalizeJobForPrompt(job) {
  const company = typeof job.company === 'string' ? job.company : job.company?.display_name || 'Company';
  const location = typeof job.location === 'string' ? job.location : job.location?.display_name || '';
  const tags = Array.isArray(job.tags) && job.tags.length ? job.tags : Array.isArray(job.skills) && job.skills.length ? job.skills : [];
  return { ...job, company, location, tags };
}

export default function CoverLetterModal({ job, onClose }) {
  const [letter, setLetter] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToastContext();
  const jobRef = useRef(job);
  jobRef.current = job;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const runGenerate = useCallback(async () => {
    const raw = jobRef.current;
    if (!raw) return;
    const currentJob = normalizeJobForPrompt(raw);
    const profile = JSON.parse(localStorage.getItem('talentforge_profile') || '{}');

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/generate_cover_letter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job: currentJob,
          profile,
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to generate cover letter.');
      }

      setLetter(data?.letter || '');
    } catch (error) {
      console.error(error);
      addToast(error.message || 'Failed to generate cover letter', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (job?.id == null) return;
    runGenerate();
  }, [job?.id, runGenerate]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(letter);
    addToast('Cover letter copied to clipboard', 'success');
  };

  const currentJob = normalizeJobForPrompt(job);

  return (
    <div className="cover-letter-modal-overlay modal-backdrop" onClick={onClose} role="presentation">
      <div className="cover-letter-modal-box modal-card" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="cover-letter-modal-header">
          <h2>AI cover letter</h2>
          <span className="cover-letter-modal-subtitle">
            {currentJob.title} at {currentJob.company}
          </span>
          <button type="button" className="cover-letter-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="cover-letter-modal-body">
          {loading ? (
            <div className="cover-letter-skeleton">
              {[72, 85, 78, 90, 75, 88].map((width, index) => (
                <div key={index} className="cover-letter-skeleton-line" style={{ width: `${width}%` }} />
              ))}
            </div>
          ) : (
            <textarea className="cover-letter-textarea" value={letter} onChange={(event) => setLetter(event.target.value)} />
          )}
        </div>

        <div className="cover-letter-modal-footer">
          <button type="button" className="btn-ghost" onClick={runGenerate} disabled={loading}>
            Regenerate
          </button>
          <button type="button" className="btn-primary" onClick={copyToClipboard} disabled={loading}>
            <Copy size={14} />
            Copy to clipboard
          </button>
        </div>
      </div>
    </div>
  );
}
