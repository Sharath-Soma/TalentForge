import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
import ThemeToggle from '../components/ThemeToggle';
import '../pages/Auth.css';

const AuthLayout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-grid-loader">
        <div className="surface-card stack-sm">
          <Loader text="Preparing secure sign-in..." />
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="auth-layout">
      <div className="auth-layout__shell">
        <div className="auth-layout__theme-toggle">
          <ThemeToggle compact />
        </div>
        <div className="auth-layout__content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
