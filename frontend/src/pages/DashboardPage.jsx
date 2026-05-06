import React, { Suspense, lazy, useCallback, useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react';
import { Search, MapPin, ArrowUpDown, SearchX, Bookmark } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../components/Card';
import JobFilters from '../components/JobFilters';
import { API_BASE_URL } from '../lib/api';

const AnalyticsPanel = lazy(() => import('../components/AnalyticsPanel'));
const SavedJobsPanel = lazy(() => import('../components/SavedJobsPanel'));

const JOBS_PER_PAGE = 12;
const INITIAL_FETCH_LIMIT = 24;
const SECONDARY_FETCH_LIMIT = 24;
const DASHBOARD_JOBS_CACHE_KEY = 'talentforge_dashboard_jobs_cache';

function matchesJobType(job, filters) {
  if (!filters.length) return true;
  const title = (job.title || '').toLowerCase();
  const location = (job.location?.display_name || '').toLowerCase();
  const description = (job.description || '').toLowerCase();
  const category = (job.category?.label || '').toLowerCase();
  const haystack = `${title} ${location} ${description} ${category}`;
  return filters.some((filter) => {
    if (filter === 'remote') {
      return haystack.includes('remote') || location.includes('remote') || title.includes('work from home');
    }
    if (filter === 'full-time') {
      return haystack.includes('full-time') || haystack.includes('full time') || (!haystack.includes('part-time') && !haystack.includes('contract'));
    }
    if (filter === 'part-time') {
      return haystack.includes('part-time') || haystack.includes('part time');
    }
    if (filter === 'contract') {
      return haystack.includes('contract') || haystack.includes('freelance') || haystack.includes('consultant');
    }
    return true;
  });
}

function matchesExperience(job, filters) {
  if (!filters.length) return true;
  const title = (job.title || '').toLowerCase();
  return filters.some((filter) => {
    if (filter === 'entry') return /junior|entry|graduate|intern|associate|fresher|0-2|1-2|trainee/.test(title);
    if (filter === 'mid') return /mid|mid-level|2-5|3-5|\bmid\b/.test(title) && !/senior|lead|principal/.test(title);
    if (filter === 'senior') return /senior|lead|principal|staff|architect|director|head|7\+|8\+|10\+/.test(title);
    return true;
  });
}

function matchesSalary(job, filter) {
  if (filter === 'all') return true;
  const salary = job.salary_max || job.salary_min || 0;
  if (filter === '0-50k') return salary <= 50000;
  if (filter === '50k-100k') return salary > 50000 && salary <= 100000;
  if (filter === '100k-150k') return salary > 100000 && salary <= 150000;
  if (filter === '150k+') return salary > 150000;
  return true;
}

function getPageNumbers(totalPages, currentPage) {
  if (totalPages <= 1) return [];
  return Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
    .reduce((pages, page, index, source) => {
      if (index > 0 && page - source[index - 1] > 1) {
        pages.push('...');
      }
      pages.push(page);
      return pages;
    }, []);
}

function safeParseSavedJobs() {
  try {
    const value = JSON.parse(localStorage.getItem('talentforge_saved_jobs') || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function safeParseDashboardJobsCache() {
  try {
    const value = JSON.parse(sessionStorage.getItem(DASHBOARD_JOBS_CACHE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function mergeJobs(primaryJobs, secondaryJobs) {
  const seen = new Set();
  return [...primaryJobs, ...secondaryJobs].filter((job) => {
    const key = String(job?.id ?? '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function AnalyticsPanelFallback() {
  return (
    <div className="analytics-panel">
      {Array.from({ length: 4 }, (_, index) => (
        <article key={index} className="stat-card skeleton">
          <span className="stat-icon skeleton-block" />
          <div className="stat-info stack-sm">
            <span className="stat-value skeleton-block" style={{ width: '52px', height: '24px' }} />
            <span className="stat-label skeleton-block" style={{ width: '88px', height: '14px' }} />
          </div>
        </article>
      ))}
    </div>
  );
}

function DashboardPage() {
  const cachedJobs = useMemo(() => safeParseDashboardJobsCache(), []);
  const [activeTab, setActiveTab] = useState('all');
  const [savedJobs, setSavedJobs] = useState(safeParseSavedJobs);
  const [jobs, setJobs] = useState(cachedJobs);
  const [loading, setLoading] = useState(cachedJobs.length === 0);
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
  const [hasMoreFromApi, setHasMoreFromApi] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [jobTypeFilter, setJobTypeFilter] = useState([]);
  const [experienceFilter, setExperienceFilter] = useState([]);
  const [salaryFilter, setSalaryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  const deferredSearch = useDeferredValue(search);
  const deferredLocation = useDeferredValue(location);
  const normalizedSearch = deferredSearch.trim().toLowerCase();
  const normalizedLocation = deferredLocation.trim().toLowerCase();
  const apiKeyword = deferredSearch.trim() || 'software engineer';

  useEffect(() => {
    if (activeTab === 'saved') {
      setSavedJobs(safeParseSavedJobs());
    }
  }, [activeTab]);

  useEffect(() => {
    const syncSaved = () => setSavedJobs(safeParseSavedJobs());
    window.addEventListener('talentforge-saved-jobs-changed', syncSaved);
    return () => window.removeEventListener('talentforge-saved-jobs-changed', syncSaved);
  }, []);

  const fetchJobs = useCallback(
    async (keyword, signal) => {
      setLoading(true);
      setFetchError('');

      const primaryParams = new URLSearchParams({
        page: '1',
        limit: String(INITIAL_FETCH_LIMIT),
        keywords: keyword,
      });

      try {
        const response = await fetch(`${API_BASE_URL}/api/fetch_jobs?${primaryParams.toString()}`, { signal });
        if (!response.ok) {
          throw new Error(`Failed to load jobs (${response.status})`);
        }

        const data = await response.json();
        const primaryJobs = Array.isArray(data?.jobs) ? data.jobs : [];
        sessionStorage.setItem(DASHBOARD_JOBS_CACHE_KEY, JSON.stringify(primaryJobs));

        startTransition(() => {
          setJobs(primaryJobs);
          setHasMoreFromApi(Boolean(data?.hasMore));
        });

        setLoading(false);

        if (!data?.hasMore) {
          setIsBackgroundLoading(false);
          return;
        }

        setIsBackgroundLoading(true);
        const secondaryParams = new URLSearchParams({
          page: '2',
          limit: String(SECONDARY_FETCH_LIMIT),
          keywords: keyword,
        });
        const secondaryResponse = await fetch(`${API_BASE_URL}/api/fetch_jobs?${secondaryParams.toString()}`, { signal });
        if (!secondaryResponse.ok) {
          throw new Error(`Failed to load more jobs (${secondaryResponse.status})`);
        }

        const secondaryData = await secondaryResponse.json();
        const secondaryJobs = Array.isArray(secondaryData?.jobs) ? secondaryData.jobs : [];

        startTransition(() => {
          setJobs((currentJobs) => {
            const merged = mergeJobs(primaryJobs.length ? primaryJobs : currentJobs, secondaryJobs);
            sessionStorage.setItem(DASHBOARD_JOBS_CACHE_KEY, JSON.stringify(merged));
            return merged;
          });
          setHasMoreFromApi(Boolean(secondaryData?.hasMore));
        });
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }

        console.error('Error fetching jobs:', error);
        setFetchError(error?.message || 'Failed to load jobs. Check your connection and API URL.');
        setHasMoreFromApi(false);
      } finally {
        setLoading(false);
        setIsBackgroundLoading(false);
      }
    },
    [startTransition]
  );

  useEffect(() => {
    if (activeTab !== 'all') return undefined;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetchJobs(apiKeyword, controller.signal);
    }, deferredSearch ? 250 : 0);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [activeTab, apiKeyword, deferredSearch, fetchJobs]);

  useEffect(() => {
    startTransition(() => {
      setCurrentPage(1);
    });
  }, [normalizedSearch, normalizedLocation, sortBy, jobTypeFilter, experienceFilter, salaryFilter, startTransition]);

  const filteredJobs = useMemo(() => {
    let result = Array.isArray(jobs) ? [...jobs] : [];

    if (normalizedSearch) {
      result = result.filter((job) => {
        const title = job.title?.toLowerCase() || '';
        const company = job.company?.display_name?.toLowerCase() || '';
        return title.includes(normalizedSearch) || company.includes(normalizedSearch);
      });
    }

    if (normalizedLocation) {
      result = result.filter((job) => job.location?.display_name?.toLowerCase().includes(normalizedLocation));
    }

    result = result.filter(
      (job) => matchesJobType(job, jobTypeFilter) && matchesExperience(job, experienceFilter) && matchesSalary(job, salaryFilter)
    );

    if (sortBy === 'latest') {
      result.sort((a, b) => new Date(b.created) - new Date(a.created));
    } else if (sortBy === 'relevant') {
      result.sort((a, b) => b.title.length - a.title.length);
    }

    return result;
  }, [jobs, normalizedSearch, normalizedLocation, sortBy, jobTypeFilter, experienceFilter, salaryFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / JOBS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedJobs = useMemo(
    () => filteredJobs.slice((currentPage - 1) * JOBS_PER_PAGE, currentPage * JOBS_PER_PAGE),
    [filteredJobs, currentPage]
  );

  const pageNumbers = useMemo(() => getPageNumbers(totalPages, currentPage), [totalPages, currentPage]);
  const showSkeletonCards = loading && jobs.length === 0;

  const handleTabChange = useCallback(
    (nextTab) => {
      startTransition(() => {
        setActiveTab(nextTab);
      });
    },
    [startTransition]
  );

  const handleSearchChange = useCallback((event) => {
    setSearch(event.target.value);
  }, []);

  const handleLocationChange = useCallback((event) => {
    setLocation(event.target.value);
  }, []);

  const handleSortChange = useCallback(
    (event) => {
      startTransition(() => {
        setSortBy(event.target.value);
      });
    },
    [startTransition]
  );

  const handleJobTypeChange = useCallback(
    (nextFilters) => {
      startTransition(() => {
        setJobTypeFilter(nextFilters);
      });
    },
    [startTransition]
  );

  const handleExperienceChange = useCallback(
    (nextFilters) => {
      startTransition(() => {
        setExperienceFilter(nextFilters);
      });
    },
    [startTransition]
  );

  const handleSalaryChange = useCallback(
    (nextSalary) => {
      startTransition(() => {
        setSalaryFilter(nextSalary);
      });
    },
    [startTransition]
  );

  const handleClearAllFilters = useCallback(() => {
    startTransition(() => {
      setJobTypeFilter([]);
      setExperienceFilter([]);
      setSalaryFilter('all');
    });
  }, [startTransition]);

  const handlePageChange = useCallback(
    (nextPage) => {
      startTransition(() => {
        setCurrentPage(nextPage);
      });
    },
    [startTransition]
  );

  const handleUnsave = useCallback((jobId) => {
    setSavedJobs((currentJobs) => {
      const updated = currentJobs.filter((job) => job.id !== jobId);
      localStorage.setItem('talentforge_saved_jobs', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <motion.div 
      className="page-shell"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="page-header">
        <div className="page-header__title-group">
          <span className="page-header__eyebrow">Dashboard</span>
          <h2>Explore opportunities with a cleaner signal-to-noise ratio.</h2>
          <p className="page-header__subtitle">
            Search across curated roles, save standouts, and move directly into interview prep, ATS analysis, or application tracking.
          </p>
        </div>
        <div className="page-header__actions">
          <span className="badge">{jobs.length} live roles</span>
          <span className="badge badge--success">{savedJobs.length} saved</span>
        </div>
      </div>

      <Suspense fallback={<AnalyticsPanelFallback />}>
        <AnalyticsPanel />
      </Suspense>

      {fetchError ? <div className="alert alert--error">{fetchError}</div> : null}

      <section className="surface-card stack">
        <div className="page-header">
          <div className="dashboard-tabs">
            <button type="button" className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => handleTabChange('all')}>
              All jobs
            </button>
            <button type="button" className={`tab-btn ${activeTab === 'saved' ? 'active' : ''}`} onClick={() => handleTabChange('saved')}>
              <Bookmark size={14} />
              Saved jobs
              {savedJobs.length > 0 ? <span className="tab-badge">{savedJobs.length}</span> : null}
            </button>
          </div>
          {activeTab === 'all' ? (
            <div className="page-header__actions">
              <span className="text-muted">
                {loading && jobs.length === 0 ? 'Loading roles...' : `${filteredJobs.length} result${filteredJobs.length === 1 ? '' : 's'}`}
              </span>
              {isBackgroundLoading || isPending ? <span className="metric-inline">Refreshing view...</span> : null}
            </div>
          ) : null}
        </div>

        {activeTab === 'all' ? (
          <>
            <div className="dashboard-search-grid">
              <div className="field-shell">
                <Search size={16} className="text-muted" />
                <input type="text" placeholder="Search title or company" value={search} onChange={handleSearchChange} />
              </div>

              <div className="field-shell">
                <MapPin size={16} className="text-muted" />
                <input type="text" placeholder="Filter by location" value={location} onChange={handleLocationChange} />
              </div>

              <JobFilters
                jobTypeFilter={jobTypeFilter}
                experienceFilter={experienceFilter}
                salaryFilter={salaryFilter}
                onJobTypeChange={handleJobTypeChange}
                onExperienceChange={handleExperienceChange}
                onSalaryChange={handleSalaryChange}
                onClearAll={handleClearAllFilters}
              />

              <div className="field-shell">
                <ArrowUpDown size={16} className="text-muted" />
                <select value={sortBy} onChange={handleSortChange}>
                  <option value="latest">Latest first</option>
                  <option value="relevant">Most relevant</option>
                </select>
              </div>
            </div>

            <div className="job-grid">
              {showSkeletonCards ? (
                Array.from({ length: 6 }, (_, index) => <Card key={`skeleton-${index}`} isLoading />)
              ) : filteredJobs.length > 0 ? (
                paginatedJobs.map((job) => <Card key={job.id} job={job} />)
              ) : (
                <div className="empty-state-card">
                  <SearchX size={40} className="text-muted" />
                  <h3>No jobs match the current filters</h3>
                  <p>Try broadening your keywords or clearing a few filters to surface more opportunities.</p>
                  <button type="button" className="btn-ghost" onClick={handleClearAllFilters}>
                    Clear filters
                  </button>
                </div>
              )}
            </div>

            {hasMoreFromApi && !loading && jobs.length >= INITIAL_FETCH_LIMIT ? (
              <p className="text-muted">Loaded the most relevant roles first. Refine keywords to pull a narrower set faster.</p>
            ) : null}

            {totalPages > 1 && !showSkeletonCards && filteredJobs.length > 0 ? (
              <div className="pagination">
                <button type="button" className="page-btn" disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}>
                  Previous
                </button>

                <div className="page-numbers">
                  {pageNumbers.map((page, index) =>
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} className="page-ellipsis">
                        ...
                      </span>
                    ) : (
                      <button
                        type="button"
                        key={page}
                        className={`page-num ${currentPage === page ? 'active' : ''}`}
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </button>
                    )
                  )}
                </div>

                <button type="button" className="page-btn" disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)}>
                  Next
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <Suspense fallback={<div className="empty-state-card"><p>Loading saved jobs...</p></div>}>
            <SavedJobsPanel savedJobs={savedJobs} onUnsave={handleUnsave} />
          </Suspense>
        )}
      </section>
    </motion.div>
  );
}

export default DashboardPage;
