import React, { useEffect, useMemo, useState, useCallback } from 'react';
import './ApplicationTrackerPage.css';

const COLUMNS = [
  { id: 'saved', label: 'Saved' },
  { id: 'applied', label: 'Applied' },
  { id: 'interview', label: 'Interview' },
  { id: 'offer', label: 'Offer' },
  { id: 'rejected', label: 'Rejected' },
];

const idEq = (a, b) => a === b || String(a) === String(b);

function buildInitialCards() {
  const saved = JSON.parse(localStorage.getItem('talentforge_saved_jobs') || '[]');
  const existing = JSON.parse(localStorage.getItem('talentforge_tracker') || '{}');

  const tracker = {
    saved: [],
    applied: [],
    interview: [],
    offer: [],
    rejected: [],
    ...existing,
  };

  COLUMNS.forEach(({ id }) => {
    if (!Array.isArray(tracker[id])) tracker[id] = [];
  });

  saved.forEach((job) => {
    const alreadyTracked = Object.values(tracker)
      .flat()
      .some((card) => card && idEq(card.id, job.id));
    if (!alreadyTracked) tracker.saved.push(job);
  });

  return tracker;
}

function companyLabel(job) {
  if (!job?.company) return 'Company';
  if (typeof job.company === 'string') return job.company;
  return job.company.display_name || 'Company';
}

function formatCardDate(job) {
  if (job.savedAt) return new Date(job.savedAt).toLocaleDateString();
  if (job.movedAt) return new Date(job.movedAt).toLocaleDateString();
  if (job.created) return new Date(job.created).toLocaleDateString();
  return 'Recently';
}

export default function ApplicationTrackerPage() {
  const [cards, setCards] = useState(buildInitialCards);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  useEffect(() => {
    localStorage.setItem('talentforge_tracker', JSON.stringify(cards));
    window.dispatchEvent(new Event('talentforge-tracker-changed'));
  }, [cards]);

  const totals = useMemo(
    () => ({
      active: (cards.saved || []).length + (cards.applied || []).length + (cards.interview || []).length,
      offers: (cards.offer || []).length,
      rejected: (cards.rejected || []).length,
    }),
    [cards]
  );

  const handleDragStart = (event, jobId, fromColumn) => {
    event.dataTransfer.setData('jobId', String(jobId));
    event.dataTransfer.setData('fromColumn', fromColumn);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = useCallback((event, toColumn) => {
    event.preventDefault();
    setDragOverColumn(null);
    const jobId = event.dataTransfer.getData('jobId');
    const fromColumn = event.dataTransfer.getData('fromColumn');
    if (!jobId || !fromColumn || fromColumn === toColumn) return;

    setCards((previous) => {
      const fromList = previous[fromColumn] || [];
      const job = fromList.find((card) => idEq(card.id, jobId));
      if (!job) return previous;
      return {
        ...previous,
        [fromColumn]: fromList.filter((card) => !idEq(card.id, jobId)),
        [toColumn]: [...(previous[toColumn] || []), { ...job, movedAt: new Date().toISOString() }],
      };
    });
  }, []);

  const handleDragOver = (event, columnId) => {
    event.preventDefault();
    setDragOverColumn(columnId);
  };

  const removeCard = (columnId, jobId) => {
    setCards((previous) => ({
      ...previous,
      [columnId]: (previous[columnId] || []).filter((job) => !idEq(job.id, jobId)),
    }));
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div className="page-header__title-group">
          <span className="page-header__eyebrow">Pipeline</span>
          <h2>Keep your applications moving without losing the story behind each role.</h2>
          <p className="page-header__subtitle">
            Drag opportunities between stages, see what is active at a glance, and keep your next action obvious.
          </p>
        </div>
      </div>

      <section className="surface-card hero-card tracker-summary">
        <div className="tracker-summary__item">
          <strong>{totals.active}</strong>
          <span>Active opportunities</span>
        </div>
        <div className="tracker-summary__item">
          <strong>{totals.offers}</strong>
          <span>Offers on deck</span>
        </div>
        <div className="tracker-summary__item">
          <strong>{totals.rejected}</strong>
          <span>Closed loops</span>
        </div>
      </section>

      <div className="kanban-board">
        {COLUMNS.map((column) => {
          const list = cards[column.id] || [];
          return (
            <section key={column.id} className="kanban-column" data-column={column.id}>
              <header className="kanban-column-header">
                <div className="kanban-column-title">
                  <span className="column-dot" />
                  <span className="column-label">{column.label}</span>
                </div>
                <span className="column-count">{list.length}</span>
              </header>

              <div
                className={`kanban-drop-zone ${dragOverColumn === column.id ? 'drag-over' : ''}`}
                onDragOver={(event) => handleDragOver(event, column.id)}
                onDragLeave={() => setDragOverColumn(null)}
                onDrop={(event) => handleDrop(event, column.id)}
              >
                {list.length === 0 ? <div className="kanban-empty">Drop opportunities here.</div> : null}

                {list.map((job) => (
                  <article
                    key={`${column.id}-${job.id}`}
                    className="kanban-card"
                    draggable
                    onDragStart={(event) => handleDragStart(event, job.id, column.id)}
                  >
                    <button
                      type="button"
                      className="kanban-card-remove"
                      onClick={() => removeCard(column.id, job.id)}
                      aria-label="Remove from tracker"
                    >
                      x
                    </button>

                    <div className="kanban-card-company">
                      <span className="kanban-card-avatar">{companyLabel(job).charAt(0).toUpperCase()}</span>
                      <div className="kanban-card-company-meta">
                        <span className="kanban-card-company-name">{companyLabel(job)}</span>
                        <span className="kanban-card-date">{formatCardDate(job)}</span>
                      </div>
                    </div>

                    <h3 className="kanban-card-title">{job.title}</h3>
                    <span className="kanban-card-stage">{column.label}</span>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
