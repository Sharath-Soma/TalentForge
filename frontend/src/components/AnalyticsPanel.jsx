import { memo, useEffect, useMemo, useState } from 'react';
import { Bookmark, Mail, MessageSquare, Award } from 'lucide-react';
import './AnalyticsPanel.css';

function safeParseArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function safeParseObject(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function AnalyticsPanel() {
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const refresh = () => setRefreshKey((count) => count + 1);
    window.addEventListener('storage', refresh);
    window.addEventListener('talentforge-saved-jobs-changed', refresh);
    window.addEventListener('talentforge-tracker-changed', refresh);

    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('talentforge-saved-jobs-changed', refresh);
      window.removeEventListener('talentforge-tracker-changed', refresh);
    };
  }, []);

  const { saved, tracker } = useMemo(() => {
    return {
      saved: safeParseArray('talentforge_saved_jobs'),
      tracker: safeParseObject('talentforge_tracker'),
    };
  }, [refreshKey]);

  const stats = [
    { label: 'Jobs saved', value: saved.length, icon: Bookmark, tone: 'primary' },
    { label: 'Applied', value: (tracker.applied || []).length, icon: Mail, tone: 'info' },
    { label: 'Interviews', value: (tracker.interview || []).length, icon: MessageSquare, tone: 'warning' },
    { label: 'Offers', value: (tracker.offer || []).length, icon: Award, tone: 'success' },
  ];

  return (
    <div className="analytics-panel">
      {stats.map(({ label, value, icon: Icon, tone }) => (
        <article key={label} className={`stat-card stat-card--${tone}`}>
          <span className="stat-icon">
            <Icon size={18} />
          </span>
          <div className="stat-info">
            <span className="stat-value">{value}</span>
            <span className="stat-label">{label}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

export default memo(AnalyticsPanel);
