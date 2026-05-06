import React, { memo, useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import './JobFilters.css';

const JOB_TYPE_OPTIONS = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'remote', label: 'Remote' },
];

const EXPERIENCE_OPTIONS = [
  { value: 'entry', label: 'Entry level' },
  { value: 'mid', label: 'Mid level' },
  { value: 'senior', label: 'Senior level' },
];

const SALARY_OPTIONS = [
  { value: 'all', label: 'Any salary' },
  { value: '0-50k', label: '$0 - $50K' },
  { value: '50k-100k', label: '$50K - $100K' },
  { value: '100k-150k', label: '$100K - $150K' },
  { value: '150k+', label: '$150K+' },
];

function getLabel(options, value) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function toggleSelection(values, nextValue) {
  return values.includes(nextValue) ? values.filter((value) => value !== nextValue) : [...values, nextValue];
}

function JobFilters({
  jobTypeFilter,
  experienceFilter,
  salaryFilter,
  onJobTypeChange,
  onExperienceChange,
  onSalaryChange,
  onClearAll,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const salarySelectId = useId();

  const selectedFilters = [
    ...jobTypeFilter.map((value) => ({
      key: `job-type-${value}`,
      label: getLabel(JOB_TYPE_OPTIONS, value),
      onRemove: () => onJobTypeChange(jobTypeFilter.filter((item) => item !== value)),
    })),
    ...experienceFilter.map((value) => ({
      key: `experience-${value}`,
      label: getLabel(EXPERIENCE_OPTIONS, value),
      onRemove: () => onExperienceChange(experienceFilter.filter((item) => item !== value)),
    })),
    ...(salaryFilter !== 'all'
      ? [
          {
            key: `salary-${salaryFilter}`,
            label: getLabel(SALARY_OPTIONS, salaryFilter),
            onRemove: () => onSalaryChange('all'),
          },
        ]
      : []),
  ];

  const hasSelections = selectedFilters.length > 0;

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className={`job-filters ${open ? 'is-open' : ''}`} ref={containerRef}>
      <div className="job-filters__control field-shell">
        <div className="job-filters__leading text-muted" aria-hidden="true">
          <SlidersHorizontal size={16} />
        </div>

        <div className="job-filters__value" onClick={() => setOpen(true)}>
          {hasSelections ? (
            <div className="job-filters__chip-list">
              {selectedFilters.map((filter) => (
                <button
                  type="button"
                  key={filter.key}
                  className="job-filters__chip"
                  onClick={(event) => {
                    event.stopPropagation();
                    filter.onRemove();
                  }}
                >
                  <span>{filter.label}</span>
                  <X size={12} />
                </button>
              ))}
            </div>
          ) : (
            <div className="job-filters__placeholder-group">
              <span className="job-filters__placeholder-label">Filters</span>
              <span className="job-filters__placeholder-copy">Type, level, salary</span>
            </div>
          )}
        </div>

        {hasSelections ? (
          <button
            type="button"
            className="job-filters__clear"
            onClick={(event) => {
              event.stopPropagation();
              onClearAll();
            }}
          >
            Clear all
          </button>
        ) : null}

        <button
          type="button"
          className="job-filters__toggle"
          onClick={() => setOpen((current) => !current)}
          aria-label={open ? 'Close filters' : 'Open filters'}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls="job-filters-panel"
        >
          {hasSelections ? <span className="job-filters__count">{selectedFilters.length}</span> : null}
          <ChevronDown size={16} />
        </button>
      </div>

      {open ? <button type="button" className="job-filters__backdrop" onClick={() => setOpen(false)} aria-label="Close filters" /> : null}

      {open ? (
        <div className="job-filters__panel" id="job-filters-panel" role="dialog" aria-modal="true" aria-label="Job filters">
          <div className="job-filters__panel-header">
            <div className="job-filters__panel-copy">
              <h3>Filters</h3>
              <p>Mix job type, experience level, and salary without taking over the page.</p>
            </div>
            <button type="button" className="job-filters__panel-close" onClick={() => setOpen(false)} aria-label="Close filters">
              <X size={16} />
            </button>
          </div>

          <div className="job-filters__panel-body">
            <section className="job-filters__section">
              <div className="job-filters__section-header">
                <div>
                  <h4>Job Type</h4>
                  <span>Select one or more</span>
                </div>
              </div>
              <div className="job-filters__option-grid">
                {JOB_TYPE_OPTIONS.map((option) => {
                  const selected = jobTypeFilter.includes(option.value);
                  return (
                    <button
                      type="button"
                      key={option.value}
                      className={`job-filters__option ${selected ? 'is-selected' : ''}`}
                      aria-pressed={selected}
                      onClick={() => onJobTypeChange(toggleSelection(jobTypeFilter, option.value))}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="job-filters__section">
              <div className="job-filters__section-header">
                <div>
                  <h4>Experience Level</h4>
                  <span>Select one or more</span>
                </div>
              </div>
              <div className="job-filters__option-grid">
                {EXPERIENCE_OPTIONS.map((option) => {
                  const selected = experienceFilter.includes(option.value);
                  return (
                    <button
                      type="button"
                      key={option.value}
                      className={`job-filters__option ${selected ? 'is-selected' : ''}`}
                      aria-pressed={selected}
                      onClick={() => onExperienceChange(toggleSelection(experienceFilter, option.value))}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="job-filters__section">
              <div className="job-filters__section-header">
                <div>
                  <h4>Salary Range</h4>
                  <span>Choose a single band</span>
                </div>
              </div>
              <div className="field-group">
                <label htmlFor={salarySelectId}>Salary range</label>
                <div className="field-shell">
                  <select id={salarySelectId} value={salaryFilter} onChange={(event) => onSalaryChange(event.target.value)}>
                    {SALARY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>
          </div>

          <div className="job-filters__panel-footer">
            {hasSelections ? (
              <button type="button" className="btn-ghost" onClick={onClearAll}>
                Clear all
              </button>
            ) : (
              <span className="text-muted">No filters selected</span>
            )}
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default memo(JobFilters);
