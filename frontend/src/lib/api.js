// API Base URL Configuration
// ============================
// For production: Use VITE_API_URL environment variable
// For local development: Use relative URLs (queries proxy to backend)
// For mobile testing: Set VITE_API_URL to http://<LOCAL_IP>:5002

// Determine API base URL with fallback strategy
function getApiBaseUrl() {
  // Priority 1: Use explicit environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Priority 2: If in development and not explicitly set, use relative URLs
  // (This allows Vite dev server to proxy requests to flask backend)
  if (import.meta.env.DEV) {
    return '';
  }

  // Priority 3: Production fallback to current origin
  return '';
}

export const API_BASE_URL = getApiBaseUrl();

// Error helper: Provide better error messages for API failures
export function createApiErrorMessage(error, defaultMsg = 'API request failed') {
  if (!navigator.onLine) {
    return 'No internet connection. Check your network and try again.';
  }

  if (error instanceof TypeError && error.message.includes('fetch')) {
    return 'Could not reach the server. Make sure the backend is running and accessible.';
  }

  return defaultMsg;
}
