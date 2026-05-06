import React, { useState } from 'react';
import { Upload, Check } from 'lucide-react';
import { API_BASE_URL } from '../lib/api';
import './ResumeAnalyzer.css';

const ResumeAnalyzer = () => {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [jobTitle, setJobTitle] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleAnalyze = async () => {
    if (!file || !jobDesc) {
      setError('Please complete all steps before analyzing.');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('resume_file', file);
    formData.append('job_description', `${jobTitle}\n\n${jobDesc}`);

    try {
      const response = await fetch(`${API_BASE_URL}/api/resume/analyze`, {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to analyze resume');
      setResult(data);
      setStep(3);
    } catch (requestError) {
      setError(requestError.message || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && (!jobTitle || !jobDesc)) {
      setError('Please enter job details first.');
      return;
    }
    setError('');
    setStep((current) => current + 1);
  };

  const prevStep = () => setStep((current) => current - 1);

  const StepCircle = ({ number, label }) => {
    const isActive = step >= number;
    const isCompleted = step > number;
    return (
      <div className={`ra-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
        <div className="ra-step-circle">{isCompleted ? <Check size={16} /> : number}</div>
        <span className="ra-step-label">{label}</span>
      </div>
    );
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div className="page-header__title-group">
          <span className="page-header__eyebrow">Resume Analyzer</span>
          <h2>Walk through a guided resume review with clear ATS scoring.</h2>
          <p className="page-header__subtitle">
            Configure the role, upload your resume, then review matched skills, missing skills, and AI feedback in a cleaner workflow.
          </p>
        </div>
      </div>

      {error ? <div className="alert alert--error">{error}</div> : null}

      <div className="ra-steps-row">
        <StepCircle number={1} label="Role config" />
        <div className={`ra-step-line ${step > 1 ? 'active' : ''}`} />
        <StepCircle number={2} label="Upload resume" />
        <div className={`ra-step-line ${step > 2 ? 'active' : ''}`} />
        <StepCircle number={3} label="Analysis" />
      </div>

      <section className="surface-card ra-form-card">
        {step === 1 ? (
          <div className="stack">
            <div className="stack-sm">
              <h3>Configure target role</h3>
              <p className="text-muted">Enter the job title and description you are trying to match.</p>
            </div>

            <div className="field-group">
              <label htmlFor="ra-job-title">Job title</label>
              <input id="ra-job-title" type="text" placeholder="Senior software engineer" value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} />
            </div>

            <div className="field-group">
              <label htmlFor="ra-job-desc">Job description</label>
              <textarea id="ra-job-desc" rows={8} placeholder="Paste the full job description here..." value={jobDesc} onChange={(event) => setJobDesc(event.target.value)} />
            </div>

            <div className="ra-actions">
              <button type="button" className="btn-primary" onClick={nextStep}>
                Continue
              </button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="stack">
            <div className="stack-sm">
              <h3>Upload your resume</h3>
              <p className="text-muted">Use a PDF or DOCX to run ATS scoring and recommendations.</p>
            </div>

            <input type="file" accept=".pdf,.docx" onChange={handleFileChange} id="ra-resume-upload" className="ra-file-input" />
            <label htmlFor="ra-resume-upload" className={`ra-upload-zone ${file ? 'has-file' : ''}`}>
              <Upload size={32} />
              {file ? (
                <div className="ra-upload-copy">
                  <strong>{file.name}</strong>
                  <span>{(file.size / 1024).toFixed(1)} KB</span>
                </div>
              ) : (
                <div className="ra-upload-copy">
                  <strong>Click to upload or drag and drop</strong>
                  <span>Supported formats: PDF and DOCX</span>
                </div>
              )}
            </label>

            <div className="ra-actions ra-actions--split">
              <button type="button" className="btn-ghost" onClick={prevStep}>
                Back
              </button>
              <button type="button" className="btn-primary" onClick={handleAnalyze} disabled={loading || !file}>
                {loading ? 'Analyzing...' : 'Analyze resume'}
              </button>
            </div>
          </div>
        ) : null}

        {step === 3 && result ? (
          <div className="stack">
            <div className="ra-results-grid">
              <div className="ra-score-col">
                <div className="ra-score-ring">
                  <svg viewBox="0 0 36 36">
                    <path className="ra-ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="ra-ring-fill" strokeDasharray={`${result.score}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <text x="18" y="20.35" className="ra-ring-text">
                      {result.score}%
                    </text>
                  </svg>
                  <h3>Match score</h3>
                </div>
                <button type="button" className="btn-primary ra-full-width">
                  Optimize my resume
                </button>
              </div>

              <div className="ra-details-col">
                <div className="stack-sm">
                  <h3>Skills matched</h3>
                  <div className="ra-tag-row">
                    {(result.matched_skills || ['Python', 'React', 'AWS']).map((skill, index) => (
                      <span key={index} className="ra-tag matched">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="stack-sm">
                  <h3>Missing skills</h3>
                  <div className="ra-tag-row">
                    {result.missing_skills?.map((skill, index) => (
                      <span key={index} className="ra-tag missing">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="stack-sm">
                  <h3>AI suggestions</h3>
                  <div className="ra-copy-box">{result.suggestions}</div>
                </div>
              </div>
            </div>

            <div className="ra-actions">
              <button type="button" className="btn-ghost" onClick={() => setStep(1)}>
                New analysis
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default ResumeAnalyzer;
