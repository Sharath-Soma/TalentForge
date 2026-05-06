import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const JobRoleContext = createContext(null);

export function JobRoleProvider({ children }) {
  const [activeJob, setActiveJobState] = useState(null);

  const setActiveJob = useCallback((job) => {
    if (job == null) {
      setActiveJobState(null);
      return;
    }
    setActiveJobState({ ...job });
  }, []);

  const clearActiveJob = useCallback(() => setActiveJobState(null), []);

  const jobRole = useMemo(() => {
    const t = activeJob?.title;
    if (typeof t !== 'string') return null;
    const trimmed = t.trim();
    return trimmed.length ? trimmed : null;
  }, [activeJob]);

  const value = useMemo(
    () => ({
      activeJob,
      jobRole,
      setActiveJob,
      clearActiveJob,
    }),
    [activeJob, jobRole, setActiveJob, clearActiveJob]
  );

  return <JobRoleContext.Provider value={value}>{children}</JobRoleContext.Provider>;
}

export function useJobRole() {
  const ctx = useContext(JobRoleContext);
  if (!ctx) {
    throw new Error('useJobRole must be used within JobRoleProvider');
  }
  return ctx;
}
