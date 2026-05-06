import React from 'react';
import { MoonStar, SunMedium } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = ({ compact = false }) => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className={`theme-toggle ${compact ? 'theme-toggle--compact' : ''}`}
      onClick={toggleTheme}
      title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
      aria-label="Toggle color theme"
    >
      <span className="theme-toggle__icon">
        {isDarkMode ? <SunMedium size={16} /> : <MoonStar size={16} />}
      </span>
      <span className="theme-toggle__label">
        <strong>{isDarkMode ? 'Light mode' : 'Dark mode'}</strong>
        <span>Stored for this browser</span>
      </span>
    </button>
  );
};

export default ThemeToggle;
