import React, { useState, useEffect } from 'react';
import { Upload, ScanSearch, X } from 'lucide-react';
import { useJobRole } from '../context/JobRoleContext';
import EmptyRoleState from '../components/EmptyRoleState';
import { API_BASE_URL } from '../lib/api';
import './AtsAgent.css';

const AtsAgent = () => {
  const { jobRole, activeJob } = useJobRole();
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!activeJob) return;
    if (activeJob.title) setJobTitle(activeJob.title);
    if (activeJob.description) setJobDescription(activeJob.description);
  }, [activeJob]);

  const handleFileChange = (event) => {
    setResumeFile(event.target.files[0] || null);
    setAnalysisResult(null);
    setOptimizationResult(null);
    setError('');
  };

  const removeFile = () => {
    setResumeFile(null);
    setAnalysisResult(null);
    setOptimizationResult(null);
  };

  const handleAnalyze = async () => {
    if (!resumeFile) {
      setError('Please upload your resume as a PDF.');
      return;
    }
    if (!jobDescription) {
      setError('Please provide a target job description.');
      return;
    }

    setIsLoading(true);
    setError('');
    setAnalysisResult(null);
    setOptimizationResult(null);

    try {
      const formData = new FormData();
      formData.append('resume_file', resumeFile);
      formData.append('job_description', jobDescription);
      const response = await fetch(`${API_BASE_URL}/api/resume/analyze`, { method: 'POST', body: formData });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to analyze resume.');
      }
      const data = await response.json();
      setAnalysisResult(data);
    } catch (requestError) {
      setError(requestError.message || 'An error occurred during analysis.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptimize = async () => {
    setIsOptimizing(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('resume_file', resumeFile);
      formData.append('job_description', jobDescription);
      const response = await fetch(`${API_BASE_URL}/api/resume/optimize`, { method: 'POST', body: formData });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to optimize resume.');
      }
      const data = await response.json();
      setOptimizationResult(data);
    } catch (requestError) {
      setError(requestError.message || 'An error occurred during optimization.');
    } finally {
      setIsOptimizing(false);
    }
  };

  if (!jobRole) {
    return (
      <EmptyRoleState
        icon="ScanSearch"
        heading="No role selected"
        message="Open a role from the dashboard first, then launch ATS analysis with the job description already loaded."
        buttonLabel="Go to dashboard"
        buttonPath="/"
      />
    );
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <div className="page-header__title-group">
          <span className="page-header__eyebrow">ATS Agent</span>
          <h2>Run a fast two-step resume review before you apply.</h2>
          <p className="page-header__subtitle">
            Analyze keyword coverage, identify missing skills, then generate sharper bullets and summary copy against the same target role.
          </p>
        </div>
      </div>

      {error ? <div className="alert alert--error">{error}</div> : null}

      <div className="ats-grid">
        <section className="surface-card ats-form-card">
          <div className="ats-phase-header">
            <span className="badge">Phase 1</span>
            <h3>Configure target role</h3>
          </div>

          <div className="field-group">
            <label htmlFor="ats-job-title">Job title</label>
            <input
              id="ats-job-title"
              type="text"
              placeholder="Senior frontend engineer"
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
            />
          </div>

          <div className="field-group">
            <label htmlFor="ats-job-description">Job description</label>
            <textarea
              id="ats-job-description"
              rows="7"
              placeholder="Paste the target job description here..."
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
            />
          </div>

          <div className="ats-phase-header">
            <span className="badge">Phase 2</span>
            <h3>Upload resume</h3>
          </div>

          <input type="file" accept=".pdf" onChange={handleFileChange} id="ats-resume-upload" className="ats-file-input" />

          {!resumeFile ? (
            <label htmlFor="ats-resume-upload" className="ats-upload-zone">
              <Upload size={32} />
              <strong>Drop your PDF here</strong>
              <span>or click to browse</span>
            </label>
          ) : (
            <div className="ats-file-display">
              <div>
                <strong>{resumeFile.name}</strong>
                <span>{(resumeFile.size / 1024).toFixed(1)} KB</span>
              </div>
              <button type="button" className="btn-ghost btn-icon" onClick={removeFile}>
                <X size={16} />
              </button>
            </div>
          )}

          {!analysisResult ? (
            <button type="button" className="btn-primary" onClick={handleAnalyze} disabled={isLoading || !resumeFile || !jobDescription}>
              {isLoading ? 'Analyzing...' : 'Analyze resume'}
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={handleOptimize} disabled={isOptimizing}>
              {isOptimizing ? 'Optimizing...' : 'Optimize resume'}
            </button>
          )}
        </section>

        <section className="surface-card ats-results-card">
          {!analysisResult && !isLoading ? (
            <div className="ats-empty-state">
              <ScanSearch size={42} />
              <h3>Ready for ATS analysis</h3>
              <p>Upload your resume and target role to see missing skills, keyword match, and next-step recommendations.</p>
            </div>
          ) : null}

          {isLoading ? (
            <div className="ats-empty-state">
              <div className="loader" />
              <p>Scanning resume content for ATS coverage...</p>
            </div>
          ) : null}

          {analysisResult ? (
            <div className="ats-results-stack">
              <div className="ats-score-banner">
                <div className="ats-score-number">{analysisResult.score}</div>
                <div className="ats-score-copy">
                  <span className="badge badge--success">ATS score</span>
                  <strong>{analysisResult.keyword_match}% keyword match</strong>
                </div>
              </div>

              <div className="progress-bar">
                <span style={{ width: `${analysisResult.keyword_match}%` }} />
              </div>

              <div className="stack-sm">
                <h3>Missing critical skills</h3>
                <div className="ats-tag-row">
                  {analysisResult.missing_skills?.map((skill) => (
                    <span key={skill} className="ats-tag ats-tag--missing">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="stack-sm">
                <h3>AI suggestions</h3>
                <div className="ats-copy-box">{analysisResult.suggestions}</div>
              </div>

              {optimizationResult ? (
                <div className="ats-optimization">
                  <div className="ats-phase-header">
                    <span className="badge badge--success">Optimized</span>
                    <h3>Tailored improvements</h3>
                  </div>

                  <div className="stack-sm">
                    <h3>Improved bullet points</h3>
                    <ul className="ats-bullet-list">
                      {optimizationResult.improved_bullets?.map((bullet, index) => (
                        <li key={index}>{bullet}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="stack-sm">
                    <h3>New professional summary</h3>
                    <div className="ats-copy-box">{optimizationResult.summary_improvement}</div>
                  </div>

                  <div className="stack-sm">
                    <h3>Suggested target keywords</h3>
                    <div className="ats-tag-row">
                      {optimizationResult.optimized_keywords?.map((keyword) => (
                        <span key={keyword} className="ats-tag ats-tag--optimized">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
};

export default AtsAgent;
