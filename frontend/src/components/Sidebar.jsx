import { memo, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Mic2,
  Search,
  Code2,
  GraduationCap,
  User,
  LogOut,
  Columns,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/tracker', label: 'Tracker', icon: Columns },
  { to: '/ats-agent', label: 'ATS Agent', icon: FileText },
  { to: '/ai-interview', label: 'Interview Prep', icon: Mic2 },
  { to: '/resume-analyzer', label: 'Resume Review', icon: Search },
  { to: '/code-lab', label: 'Code Lab', icon: Code2 },
  { to: '/course-predictor', label: 'Courses', icon: GraduationCap },
  { to: '/profile', label: 'Profile', icon: User },
];

const Sidebar = ({ isOpen, onClose }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  return (
    <>
      <button type="button" className={`sidebar-backdrop ${isOpen ? 'is-visible' : ''}`} onClick={onClose} aria-label="Close navigation" />
      <aside className={`sidebar ${isOpen ? 'is-open' : ''}`}>
        <div className="sidebar__header">
          <div className="sidebar__brand">
            <span className="sidebar__brand-mark">
              <Code2 size={18} />
            </span>
            <div className="sidebar__brand-copy">
              <strong>TalentForge</strong>
              <span>AI job search OS</span>
            </div>
          </div>

          <button type="button" className="btn-ghost btn-icon sidebar__close" onClick={onClose} aria-label="Close navigation">
            <X size={18} />
          </button>
        </div>

        <div className="sidebar__section">
          <span className="sidebar__section-label">Workspace</span>
          <nav className="sidebar__nav">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => (isActive ? 'sidebar__link is-active' : 'sidebar__link')}
                onClick={onClose}
              >
                <span className="sidebar__link-icon">
                  <Icon size={18} />
                </span>
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="sidebar__footer">
          <div className="sidebar__profile">
            <span className="sidebar__profile-avatar">
              {(user?.name || user?.email || 'T').charAt(0).toUpperCase()}
            </span>
            <div className="sidebar__profile-copy">
              <strong>{user?.name || 'TalentForge member'}</strong>
              <span>{user?.email || 'Career tools ready'}</span>
            </div>
          </div>

          <button type="button" className="btn-secondary sidebar__logout" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default memo(Sidebar);
