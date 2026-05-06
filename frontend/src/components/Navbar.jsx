import { memo } from 'react';
import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

const PAGE_COPY = {
  '/': {
    title: 'Career workspace',
    subtitle: 'Search, shortlist, and move on the right opportunities faster.',
  },
  '/tracker': {
    title: 'Application tracker',
    subtitle: 'Keep every opportunity moving with a clean stage-by-stage pipeline.',
  },
  '/ats-agent': {
    title: 'ATS optimizer',
    subtitle: 'Audit resume fit and generate role-specific improvements.',
  },
  '/resume-analyzer': {
    title: 'Resume analyzer',
    subtitle: 'Run a guided review before you send your next application.',
  },
  '/code-lab': {
    title: 'Code lab',
    subtitle: 'Practice interview problems and validate ideas in one focused workspace.',
  },
  '/ai-interview': {
    title: 'Interview practice',
    subtitle: 'Generate role-aware questions and get structured AI feedback.',
  },
  '/course-predictor': {
    title: 'Course recommendations',
    subtitle: 'Find the fastest upskilling path for the role you are targeting.',
  },
  '/profile': {
    title: 'Profile center',
    subtitle: 'Keep your candidate profile sharp so every tool gets smarter.',
  },
};

function getPageCopy(pathname) {
  return PAGE_COPY[pathname] || PAGE_COPY['/'];
}

const Navbar = ({ onMenuToggle }) => {
  const location = useLocation();
  const { user } = useAuth();
  const { title, subtitle } = getPageCopy(location.pathname);

  return (
    <header className="topbar">
      <div className="topbar__left">
        <button type="button" className="btn-ghost btn-icon topbar__menu" onClick={onMenuToggle} aria-label="Open navigation">
          <Menu size={18} />
        </button>
        <div className="topbar__meta">
          <span className="topbar__eyebrow">TalentForge</span>
          <h1 className="topbar__title">{title}</h1>
          <p className="topbar__subtitle">{subtitle}</p>
        </div>
      </div>

      <div className="topbar__center" aria-hidden="true">
        <h1 className="topbar__mobile-title">{title}</h1>
      </div>

      <div className="topbar__actions">
        <div className="topbar__user">
          <span className="topbar__user-label">Signed in as</span>
          <strong>{user?.name || user?.email || 'TalentForge member'}</strong>
        </div>
        <ThemeToggle compact />
      </div>
    </header>
  );
};

export default memo(Navbar);
