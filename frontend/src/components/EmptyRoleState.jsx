import { useNavigate } from 'react-router-dom';
import { GraduationCap, MessageSquare, ScanSearch } from 'lucide-react';
import './EmptyRoleState.css';

const ICONS = { GraduationCap, MessageSquare, ScanSearch };

export default function EmptyRoleState({ icon, heading, message, buttonLabel, buttonPath }) {
  const navigate = useNavigate();
  const Icon = ICONS[icon] || MessageSquare;

  return (
    <div className="empty-role-state">
      <div className="empty-role-card">
        <Icon size={48} className="empty-icon" />
        <h2 className="empty-heading">{heading}</h2>
        <p className="empty-message">{message}</p>
        <button type="button" className="btn-primary" onClick={() => navigate(buttonPath)}>
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
