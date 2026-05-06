import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import './App.css';

import AuthLayout from './layouts/AuthLayout';
import AppLayout from './layouts/AppLayout';
import Loader from './components/Loader';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { JobRoleProvider } from './context/JobRoleContext';
import { ToastProvider } from './context/ToastContext';

const Index = lazy(() => import('./pages/Index'));
const CheckJobPage = lazy(() => import('./pages/CheckJobPage'));
const Practice = lazy(() => import('./pages/Practice'));
const Course = lazy(() => import('./pages/Course'));
const AtsAgent = lazy(() => import('./pages/AtsAgent'));
const ResumeAnalyzer = lazy(() => import('./pages/ResumeAnalyzer'));
const CodeLab = lazy(() => import('./pages/CodeLab'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ApplicationTrackerPage = lazy(() => import('./pages/ApplicationTrackerPage'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));

function RouteFallback() {
  return (
    <div className="page-grid-loader">
      <div className="surface-card stack-sm">
        <Loader text="Loading workspace..." />
      </div>
    </div>
  );
}

const App = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <JobRoleProvider>
              <Suspense fallback={<RouteFallback />}>
                <AnimatePresence mode="wait">
                  <Routes>
                    <Route element={<AuthLayout />}>
                      <Route path="/login" element={<Login />} />
                      <Route path="/signup" element={<Signup />} />
                    </Route>

                    <Route element={<AppLayout />}>
                      <Route path="/" element={<Index />} />
                      <Route path="/dashboard" element={<Navigate to="/" replace />} />
                      <Route path="/tracker" element={<ApplicationTrackerPage />} />
                      <Route path="/ats-agent" element={<AtsAgent />} />
                      <Route path="/check/:jobId" element={<CheckJobPage />} />
                      <Route path="/job/:jobId" element={<CheckJobPage />} />
                      <Route path="/resume-analyzer" element={<ResumeAnalyzer />} />
                      <Route path="/code-lab" element={<CodeLab />} />
                      <Route path="/ai-interview" element={<Practice />} />
                      <Route path="/course-predictor" element={<Course />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/practice" element={<Navigate to="/ai-interview" replace />} />
                      <Route path="/course_predict" element={<Navigate to="/course-predictor" replace />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </AnimatePresence>
              </Suspense>
            </JobRoleProvider>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
