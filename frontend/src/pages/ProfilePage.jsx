import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pencil,
  Plus,
  Trash2,
  Upload,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './ProfilePage.css';

const STORAGE_KEY = 'talentforge_profile';
const RESUME_KEY = 'talentforge_resume';
const MAX_RESUME_BYTES = 5 * 1024 * 1024;

const emptyExperience = () => ({
  id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `exp-${Date.now()}-${Math.random()}`,
  company: '',
  jobTitle: '',
  startDate: '',
  endDate: '',
  current: false,
  description: '',
});

const defaultProfile = {
  fullName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  address: '',
  college: '',
  degree: '',
  graduationYear: '',
  cgpa: '',
  summary: '',
  experiences: [],
  skills: [],
};

function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultProfile };
    return { ...defaultProfile, ...JSON.parse(raw) };
  } catch {
    return { ...defaultProfile };
  }
}

function loadResume() {
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function formatMonthDisplay(val) {
  if (!val || typeof val !== 'string') return '';
  const [y, m] = val.split('-');
  if (!y || !m) return val;
  const d = new Date(Number(y), Number(m) - 1, 1);
  if (Number.isNaN(d.getTime())) return val;
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function countCompleted(profile, user) {
  let n = 0;
  if (profile.fullName?.trim()) n += 1;
  if (user?.email?.trim() || profile.email?.trim()) n += 1;
  if (profile.phone?.trim()) n += 1;
  if (profile.college?.trim()) n += 1;
  if (profile.degree?.trim()) n += 1;
  if (profile.summary?.trim()) n += 1;
  return n;
}

const ProfilePage = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(defaultProfile);
  const [resume, setResume] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [editBuffer, setEditBuffer] = useState(null);
  const [skillInput, setSkillInput] = useState('');
  const [barWidth, setBarWidth] = useState(0);
  const [resumeError, setResumeError] = useState('');

  const personalRef = useRef(null);
  const educationRef = useRef(null);
  const summaryRef = useRef(null);
  const workRef = useRef(null);
  const skillsRef = useRef(null);
  const resumeRef = useRef(null);
  const progressTrackRef = useRef(null);

  const fullNameRef = useRef(null);
  const phoneRef = useRef(null);
  const collegeRef = useRef(null);
  const degreeRef = useRef(null);
  const summaryInputRef = useRef(null);

  const displayEmail = user?.email || profile.email || '';

  useEffect(() => {
    setProfile(loadProfile());
    setResume(loadResume());
  }, []);

  const persistProfile = useCallback((next) => {
    const { email: _e, ...rest } = next;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
  }, []);

  const completed = useMemo(() => countCompleted(profile, user), [profile, user]);
  const totalRequired = 6;
  const pct = Math.round((completed / totalRequired) * 100);
  const remaining = totalRequired - completed;
  const isComplete = completed >= totalRequired;

  useEffect(() => {
    setBarWidth(pct);
  }, [pct]);

  useEffect(() => {
    progressTrackRef.current?.style.setProperty('--fill', `${barWidth}%`);
  }, [barWidth]);

  const startEdit = (section) => {
    if (section === 'personal') {
      setEditBuffer({
        fullName: profile.fullName,
        phone: profile.phone,
        dateOfBirth: profile.dateOfBirth,
        address: profile.address,
      });
    } else if (section === 'education') {
      setEditBuffer({
        college: profile.college,
        degree: profile.degree,
        graduationYear: profile.graduationYear,
        cgpa: profile.cgpa,
      });
    } else if (section === 'summary') {
      setEditBuffer({ summary: profile.summary });
    } else if (section === 'work') {
      setEditBuffer({
        experiences:
          profile.experiences.length > 0
            ? profile.experiences.map((e) => ({ ...e }))
            : [emptyExperience()],
      });
    } else if (section === 'skills') {
      setEditBuffer({ skills: [...profile.skills] });
    } else if (section === 'resume') {
      setEditBuffer({ replace: true });
    }
    setEditingSection(section);
  };

  const cancelEdit = () => {
    setEditingSection(null);
    setEditBuffer(null);
    setResumeError('');
  };

  const saveSection = (section) => {
    if (!editBuffer) return;
    if (section === 'personal') {
      setProfile((p) => {
        const next = {
          ...p,
          fullName: editBuffer.fullName ?? '',
          phone: editBuffer.phone ?? '',
          dateOfBirth: editBuffer.dateOfBirth ?? '',
          address: editBuffer.address ?? '',
        };
        persistProfile(next);
        return next;
      });
    } else if (section === 'education') {
      setProfile((p) => {
        const next = {
          ...p,
          college: editBuffer.college ?? '',
          degree: editBuffer.degree ?? '',
          graduationYear: editBuffer.graduationYear ?? '',
          cgpa: editBuffer.cgpa ?? '',
        };
        persistProfile(next);
        return next;
      });
    } else if (section === 'summary') {
      setProfile((p) => {
        const next = { ...p, summary: editBuffer.summary ?? '' };
        persistProfile(next);
        return next;
      });
    } else if (section === 'work') {
      setProfile((p) => {
        const next = { ...p, experiences: editBuffer.experiences ?? [] };
        persistProfile(next);
        return next;
      });
    } else if (section === 'skills') {
      setProfile((p) => {
        const next = { ...p, skills: editBuffer.skills ?? [] };
        persistProfile(next);
        return next;
      });
    }
    setEditingSection(null);
    setEditBuffer(null);
  };

  const addExperience = () => {
    if (!editBuffer?.experiences) return;
    setEditBuffer({
      ...editBuffer,
      experiences: [...editBuffer.experiences, emptyExperience()],
    });
  };

  const removeExperience = (id) => {
    if (!editBuffer?.experiences) return;
    setEditBuffer({
      ...editBuffer,
      experiences: editBuffer.experiences.filter((e) => e.id !== id),
    });
  };

  const updateExperience = (id, field, value) => {
    if (!editBuffer?.experiences) return;
    setEditBuffer({
      ...editBuffer,
      experiences: editBuffer.experiences.map((e) =>
        e.id === id ? { ...e, [field]: value, ...(field === 'current' && value ? { endDate: '' } : {}) } : e
      ),
    });
  };

  const addSkill = () => {
    const t = skillInput.trim();
    if (!t || !editBuffer?.skills) return;
    if (editBuffer.skills.includes(t)) {
      setSkillInput('');
      return;
    }
    setEditBuffer({ ...editBuffer, skills: [...editBuffer.skills, t] });
    setSkillInput('');
  };

  const removeSkill = (skill) => {
    if (!editBuffer?.skills) return;
    setEditBuffer({ ...editBuffer, skills: editBuffer.skills.filter((s) => s !== skill) });
  };

  const handleResumeFile = (file) => {
    setResumeError('');
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setResumeError('Please upload a PDF file.');
      return;
    }
    if (file.size > MAX_RESUME_BYTES) {
      setResumeError('File must be 5MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result;
      const payload = {
        filename: file.name,
        uploadedAt: new Date().toISOString(),
        data,
      };
      localStorage.setItem(RESUME_KEY, JSON.stringify(payload));
      setResume(payload);
      setEditingSection(null);
      setEditBuffer(null);
    };
    reader.readAsDataURL(file);
  };

  const viewResume = () => {
    if (!resume?.data) return;
    const w = window.open();
    if (w) {
      w.document.write(
        `<iframe width="100%" height="100%" style="border:none;min-height:100vh" src="${resume.data}"></iframe>`
      );
    }
  };

  const handleCompleteNow = () => {
    if (!profile.fullName?.trim()) {
      personalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      startEdit('personal');
      setTimeout(() => fullNameRef.current?.focus(), 450);
      return;
    }
    if (!profile.phone?.trim()) {
      personalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      startEdit('personal');
      setTimeout(() => phoneRef.current?.focus(), 450);
      return;
    }
    if (!displayEmail?.trim()) {
      personalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      startEdit('personal');
      setTimeout(() => document.getElementById('pf-email')?.focus(), 450);
      return;
    }
    if (!profile.college?.trim()) {
      educationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      startEdit('education');
      setTimeout(() => collegeRef.current?.focus(), 450);
      return;
    }
    if (!profile.degree?.trim()) {
      educationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      startEdit('education');
      setTimeout(() => degreeRef.current?.focus(), 450);
      return;
    }
    if (!profile.summary?.trim()) {
      summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      startEdit('summary');
      setTimeout(() => summaryInputRef.current?.focus(), 450);
    }
  };

  const renderEmpty = (val) =>
    val !== undefined && val !== null && String(val).trim() !== '' ? (
      val
    ) : (
      <span className="profile-value-empty">Not provided</span>
    );

  return (
    <div className="profile-page page-shell">
      <div className="profile-header-block">
        <h1 className="profile-page-title">My Profile</h1>
        <p className="profile-page-subtitle">Manage your personal information and career details</p>

        <div className="profile-completion-row profile-completion-block">
          <span className="profile-completion-label">Profile Completion</span>
          <span className="profile-completion-pct">{pct}%</span>
        </div>
        <div ref={progressTrackRef} className="profile-progress-track">
          <div className="profile-progress-fill profile-progress-fill--animated" />
        </div>
        <p className="profile-fields-remaining">{remaining} fields remaining</p>
      </div>

      {!isComplete && (
        <div className="profile-banner">
          <div className="profile-banner-left">
            <AlertCircle className="profile-banner-icon" size={22} aria-hidden />
            <p className="profile-banner-text">
              Your profile is incomplete. Complete your profile to get better job matches and AI recommendations.
            </p>
          </div>
          <button type="button" className="btn-primary profile-btn-sm btn-save" onClick={handleCompleteNow}>
            Complete Now
          </button>
        </div>
      )}

      {/* Personal */}
      <section ref={personalRef} className="profile-section-card">
        <div className="profile-section-head">
          <h2 className="profile-section-title">Personal Information</h2>
          <div className="profile-section-actions">
            {editingSection === 'personal' ? (
              <>
                <button type="button" className="btn-ghost btn-edit" onClick={cancelEdit}>
                  Cancel
                </button>
                <button type="button" className="btn-primary btn-save" onClick={() => saveSection('personal')}>
                  Save
                </button>
              </>
            ) : (
              <button type="button" className="btn-ghost btn-edit profile-section-edit" onClick={() => startEdit('personal')}>
                <Pencil size={16} aria-hidden />
                <span>Edit</span>
              </button>
            )}
          </div>
        </div>

        {editingSection === 'personal' && editBuffer ? (
          <div className="profile-field-edit">
            <div className="profile-field">
              <div className="profile-label-row">
                <label htmlFor="pf-fullname">Full Name</label>
                <span className="profile-required" aria-hidden>
                  *
                </span>
              </div>
              <input
                id="pf-fullname"
                ref={fullNameRef}
                value={editBuffer.fullName}
                onChange={(e) => setEditBuffer({ ...editBuffer, fullName: e.target.value })}
              />
            </div>
            <div className="profile-field">
              <div className="profile-label-row">
                <label htmlFor="pf-email">Email</label>
                <span className="profile-required" aria-hidden>
                  *
                </span>
              </div>
              <input id="pf-email" className="profile-input-readonly" type="email" value={displayEmail} readOnly />
            </div>
            <div className="profile-field">
              <div className="profile-label-row">
                <label htmlFor="pf-phone">Phone Number</label>
                <span className="profile-required" aria-hidden>
                  *
                </span>
              </div>
              <input
                id="pf-phone"
                ref={phoneRef}
                type="tel"
                value={editBuffer.phone}
                onChange={(e) => setEditBuffer({ ...editBuffer, phone: e.target.value })}
              />
            </div>
            <div className="profile-field">
              <label htmlFor="pf-dob">Date of Birth</label>
              <input
                id="pf-dob"
                type="date"
                value={editBuffer.dateOfBirth}
                onChange={(e) => setEditBuffer({ ...editBuffer, dateOfBirth: e.target.value })}
              />
            </div>
            <div className="profile-field">
              <label htmlFor="pf-address">Address</label>
              <textarea
                id="pf-address"
                className="profile-textarea-sm"
                rows={2}
                value={editBuffer.address}
                onChange={(e) => setEditBuffer({ ...editBuffer, address: e.target.value })}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="profile-field">
              <div className="profile-label-row">
                <span className="profile-label-static">Full Name</span>
                <span className="profile-required">*</span>
              </div>
              <div className="profile-field-view">{renderEmpty(profile.fullName)}</div>
            </div>
            <div className="profile-field">
              <div className="profile-label-row">
                <span className="profile-label-static">Email</span>
                <span className="profile-required">*</span>
              </div>
              <div className="profile-field-view">{renderEmpty(displayEmail)}</div>
            </div>
            <div className="profile-field">
              <div className="profile-label-row">
                <span className="profile-label-static">Phone Number</span>
                <span className="profile-required">*</span>
              </div>
              <div className="profile-field-view">{renderEmpty(profile.phone)}</div>
            </div>
            <div className="profile-field">
              <span className="profile-label-static profile-label-row">Date of Birth</span>
              <div className="profile-field-view">
                {profile.dateOfBirth ? profile.dateOfBirth : <span className="profile-value-empty">Not provided</span>}
              </div>
            </div>
            <div className="profile-field">
              <span className="profile-label-static profile-label-row">Address</span>
              <div className="profile-field-view profile-field-view-multiline">
                {profile.address?.trim() ? profile.address : <span className="profile-value-empty">Not provided</span>}
              </div>
            </div>
          </>
        )}
      </section>

      {/* Education */}
      <section ref={educationRef} className="profile-section-card">
        <div className="profile-section-head">
          <h2 className="profile-section-title">Education</h2>
          <div className="profile-section-actions">
            {editingSection === 'education' ? (
              <>
                <button type="button" className="btn-ghost btn-edit" onClick={cancelEdit}>
                  Cancel
                </button>
                <button type="button" className="btn-primary btn-save" onClick={() => saveSection('education')}>
                  Save
                </button>
              </>
            ) : (
              <button type="button" className="btn-ghost btn-edit profile-section-edit" onClick={() => startEdit('education')}>
                <Pencil size={16} aria-hidden />
                <span>Edit</span>
              </button>
            )}
          </div>
        </div>

        {editingSection === 'education' && editBuffer ? (
          <div className="profile-field-edit">
            <div className="profile-field">
              <div className="profile-label-row">
                <label htmlFor="pf-college">Current College / University</label>
                <span className="profile-required">*</span>
              </div>
              <input
                id="pf-college"
                ref={collegeRef}
                value={editBuffer.college}
                onChange={(e) => setEditBuffer({ ...editBuffer, college: e.target.value })}
              />
            </div>
            <div className="profile-field">
              <div className="profile-label-row">
                <label htmlFor="pf-degree">Degree</label>
                <span className="profile-required">*</span>
              </div>
              <input
                id="pf-degree"
                ref={degreeRef}
                placeholder="e.g. B.Tech Computer Science"
                value={editBuffer.degree}
                onChange={(e) => setEditBuffer({ ...editBuffer, degree: e.target.value })}
              />
            </div>
            <div className="profile-grid-2">
              <div className="profile-field">
                <label htmlFor="pf-year">Year of Graduation</label>
                <input
                  id="pf-year"
                  type="number"
                  min="1950"
                  max="2100"
                  value={editBuffer.graduationYear}
                  onChange={(e) => setEditBuffer({ ...editBuffer, graduationYear: e.target.value })}
                />
              </div>
              <div className="profile-field">
                <label htmlFor="pf-cgpa">CGPA / Percentage</label>
                <input
                  id="pf-cgpa"
                  value={editBuffer.cgpa}
                  onChange={(e) => setEditBuffer({ ...editBuffer, cgpa: e.target.value })}
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="profile-field">
              <div className="profile-label-row">
                <span className="profile-label-static">Current College / University</span>
                <span className="profile-required">*</span>
              </div>
              <div className="profile-field-view">{renderEmpty(profile.college)}</div>
            </div>
            <div className="profile-field">
              <div className="profile-label-row">
                <span className="profile-label-static">Degree</span>
                <span className="profile-required">*</span>
              </div>
              <div className="profile-field-view">{renderEmpty(profile.degree)}</div>
            </div>
            <div className="profile-grid-2">
              <div className="profile-field">
                <span className="profile-label-static profile-label-row">Year of Graduation</span>
                <div className="profile-field-view">{renderEmpty(profile.graduationYear)}</div>
              </div>
              <div className="profile-field">
                <span className="profile-label-static profile-label-row">CGPA / Percentage</span>
                <div className="profile-field-view">{renderEmpty(profile.cgpa)}</div>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Summary */}
      <section ref={summaryRef} className="profile-section-card">
        <div className="profile-section-head">
          <h2 className="profile-section-title">Professional Summary</h2>
          <div className="profile-section-actions">
            {editingSection === 'summary' ? (
              <>
                <button type="button" className="btn-ghost btn-edit" onClick={cancelEdit}>
                  Cancel
                </button>
                <button type="button" className="btn-primary btn-save" onClick={() => saveSection('summary')}>
                  Save
                </button>
              </>
            ) : (
              <button type="button" className="btn-ghost btn-edit profile-section-edit" onClick={() => startEdit('summary')}>
                <Pencil size={16} aria-hidden />
                <span>Edit</span>
              </button>
            )}
          </div>
        </div>

        {editingSection === 'summary' && editBuffer ? (
          <div className="profile-field-edit">
            <div className="profile-field">
              <div className="profile-label-row">
                <label htmlFor="pf-summary">Summary</label>
                <span className="profile-required">*</span>
              </div>
              <textarea
                id="pf-summary"
                ref={summaryInputRef}
                className="profile-textarea"
                placeholder="Write a brief summary about yourself, your skills, and your career goals..."
                value={editBuffer.summary}
                onChange={(e) => setEditBuffer({ ...editBuffer, summary: e.target.value })}
              />
            </div>
          </div>
        ) : (
          <div className="profile-field">
            <div className="profile-label-row">
              <span className="profile-label-static">Summary</span>
              <span className="profile-required">*</span>
            </div>
            <div className="profile-field-view">{renderEmpty(profile.summary)}</div>
          </div>
        )}
      </section>

      {/* Work */}
      <section ref={workRef} className="profile-section-card">
        <div className="profile-section-head">
          <h2 className="profile-section-title">Work Experience</h2>
          <div className="profile-section-actions">
            {editingSection === 'work' ? (
              <>
                <button type="button" className="btn-ghost btn-edit" onClick={cancelEdit}>
                  Cancel
                </button>
                <button type="button" className="btn-primary btn-save" onClick={() => saveSection('work')}>
                  Save
                </button>
              </>
            ) : (
              <button type="button" className="btn-ghost btn-edit profile-section-edit" onClick={() => startEdit('work')}>
                <Pencil size={16} aria-hidden />
                <span>Edit</span>
              </button>
            )}
          </div>
        </div>

        {editingSection === 'work' && editBuffer?.experiences ? (
          <div className="profile-field-edit">
            <div className="profile-experience-list">
              {editBuffer.experiences.map((exp) => (
                <div key={exp.id} className="experience-entry">
                  <button
                    type="button"
                    className="experience-entry-remove"
                    onClick={() => removeExperience(exp.id)}
                    aria-label="Remove experience"
                  >
                    <Trash2 size={18} />
                  </button>
                  <div className="profile-field">
                    <label>Company Name</label>
                    <input
                      value={exp.company}
                      onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                    />
                  </div>
                  <div className="profile-field">
                    <label>Job Title</label>
                    <input
                      value={exp.jobTitle}
                      onChange={(e) => updateExperience(exp.id, 'jobTitle', e.target.value)}
                    />
                  </div>
                  <div className="profile-grid-2">
                    <div className="profile-field">
                      <label>Start Date</label>
                      <input
                        type="month"
                        value={exp.startDate}
                        onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)}
                      />
                    </div>
                    <div className="profile-field">
                      <label>End Date</label>
                      <input
                        type="month"
                        value={exp.endDate}
                        disabled={exp.current}
                        onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)}
                      />
                    </div>
                  </div>
                    <div className="profile-field">
                    <label className="profile-checkbox-label">
                      <input
                        type="checkbox"
                        checked={exp.current}
                        onChange={(e) => updateExperience(exp.id, 'current', e.target.checked)}
                      />
                      Currently working here
                    </label>
                  </div>
                  <div className="profile-field">
                    <label>Description</label>
                    <textarea
                      className="profile-textarea-sm"
                      rows={2}
                      value={exp.description}
                      onChange={(e) => updateExperience(exp.id, 'description', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="btn-ghost btn-edit profile-add-exp-btn" onClick={addExperience}>
              <Plus size={16} aria-hidden />
              <span>Add Experience</span>
            </button>
          </div>
        ) : (
          <div className="profile-experience-list">
            {profile.experiences.length === 0 ? (
              <p className="profile-value-empty">No experience added</p>
            ) : (
              profile.experiences.map((exp) => (
                <div key={exp.id} className="experience-entry">
                  <div className="profile-field">
                    <span className="profile-label-static profile-label-row">Company</span>
                    <div className="profile-field-view">{renderEmpty(exp.company)}</div>
                  </div>
                  <div className="profile-field">
                    <span className="profile-label-static profile-label-row">Job Title</span>
                    <div className="profile-field-view">{renderEmpty(exp.jobTitle)}</div>
                  </div>
                  <div className="profile-grid-2">
                    <div>
                      <span className="profile-label-static profile-label-row">Start</span>
                      <div className="profile-field-view">
                        {formatMonthDisplay(exp.startDate) || <span className="profile-value-empty">Not provided</span>}
                      </div>
                    </div>
                    <div>
                      <span className="profile-label-static profile-label-row">End</span>
                      <div className="profile-field-view">
                        {exp.current
                          ? 'Present'
                          : formatMonthDisplay(exp.endDate) || <span className="profile-value-empty">Not provided</span>}
                      </div>
                    </div>
                  </div>
                  <div className="profile-field">
                    <span className="profile-label-static profile-label-row">Description</span>
                    <div className="profile-field-view">{renderEmpty(exp.description)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* Skills */}
      <section ref={skillsRef} className="profile-section-card">
        <div className="profile-section-head">
          <h2 className="profile-section-title">Skills</h2>
          <div className="profile-section-actions">
            {editingSection === 'skills' ? (
              <>
                <button type="button" className="btn-ghost btn-edit" onClick={cancelEdit}>
                  Cancel
                </button>
                <button type="button" className="btn-primary btn-save" onClick={() => saveSection('skills')}>
                  Save
                </button>
              </>
            ) : (
              <button type="button" className="btn-ghost btn-edit profile-section-edit" onClick={() => startEdit('skills')}>
                <Pencil size={16} aria-hidden />
                <span>Edit</span>
              </button>
            )}
          </div>
        </div>

        {editingSection === 'skills' && editBuffer?.skills ? (
          <div className="profile-field-edit">
            <div className="profile-skill-add">
              <input
                type="text"
                placeholder="e.g. React, Python, SQL"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              />
              <button type="button" className="btn-ghost btn-edit" onClick={addSkill}>
                Add
              </button>
            </div>
            <div className="profile-skills-row">
              {editBuffer.skills.map((s) => (
                <span key={s} className="skill-chip">
                  {s}
                  <button type="button" className="remove" onClick={() => removeSkill(s)} aria-label={`Remove ${s}`}>
                    x
                  </button>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="profile-skills-row">
            {profile.skills.length === 0 ? (
              <span className="profile-value-empty">Not provided</span>
            ) : (
              profile.skills.map((s) => (
                <span key={s} className="skill-chip">
                  {s}
                </span>
              ))
            )}
          </div>
        )}
      </section>

      {/* Resume */}
      <section ref={resumeRef} className="profile-section-card">
        <div className="profile-section-head">
          <h2 className="profile-section-title">Default Resume</h2>
          <div className="profile-section-actions">
            {resume && editingSection === 'resume' ? (
              <>
                <button type="button" className="btn-ghost btn-edit" onClick={cancelEdit}>
                  Cancel
                </button>
                <button type="button" className="btn-primary btn-save" onClick={cancelEdit}>
                  Done
                </button>
              </>
            ) : resume ? (
              <button type="button" className="btn-ghost btn-edit profile-section-edit" onClick={() => startEdit('resume')}>
                <Pencil size={16} aria-hidden />
                <span>Edit</span>
              </button>
            ) : null}
          </div>
        </div>

        {!resume && (
          <label className="profile-upload-zone upload-zone">
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="profile-file-input-hidden"
              onChange={(e) => handleResumeFile(e.target.files?.[0])}
            />
            <Upload size={32} aria-hidden />
            <span className="profile-upload-title">Upload your default resume</span>
            <span className="profile-upload-hint">PDF only, max 5MB</span>
          </label>
        )}

        {resume && editingSection !== 'resume' && (
          <div className="profile-resume-file">
            <FileText size={24} color="var(--accent)" aria-hidden />
            <div>
              <div className="profile-field-view">{resume.filename}</div>
              <div className="profile-resume-meta">
                {resume.uploadedAt ? new Date(resume.uploadedAt).toLocaleString() : ''}
              </div>
            </div>
            <div className="profile-resume-actions">
              <button type="button" className="btn-ghost btn-edit" onClick={viewResume}>
                View
              </button>
              <button type="button" className="btn-ghost btn-edit" onClick={() => startEdit('resume')}>
                Replace
              </button>
            </div>
          </div>
        )}

        {resume && editingSection === 'resume' && (
          <label className="profile-upload-zone upload-zone">
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="profile-file-input-hidden"
              onChange={(e) => handleResumeFile(e.target.files?.[0])}
            />
            <Upload size={32} aria-hidden />
            <span className="profile-upload-title">Choose a new PDF</span>
            <span className="profile-upload-hint">PDF only, max 5MB</span>
          </label>
        )}

        {resumeError && <p className="profile-value-empty profile-resume-error">{resumeError}</p>}
      </section>
    </div>
  );
};

export default ProfilePage;

