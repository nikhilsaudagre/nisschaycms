import axios, { InternalAxiosRequestConfig, AxiosResponse } from 'axios';

export const getBaseApiUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  // If running in browser
  if (typeof window !== 'undefined') {
    const currentHost = window.location.hostname;
    const isLocalhost =
      currentHost === 'localhost' ||
      currentHost === '127.0.0.1' ||
      /^192\.168\./.test(currentHost) ||
      /^10\./.test(currentHost) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(currentHost);

    // If on local dev/LAN machine, point to local Spring Boot on port 8085
    if (isLocalhost) {
      return `http://${currentHost}:8085/api/v1`;
    }

    // If explicit production API URL is provided in environment variables, use it
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      let cleanUrl = envUrl.replace(/\/+$/, '');
      if (!cleanUrl.endsWith('/api/v1')) {
        cleanUrl = `${cleanUrl}/api/v1`;
      }
      return cleanUrl;
    }

    // Default Render production backend fallback if no custom env is set
    return 'https://nisschay-cms-backend.onrender.com/api/v1';
  }

  // Server-side rendering (SSR) fallback
  if (envUrl) {
    let cleanUrl = envUrl.replace(/\/+$/, '');
    if (!cleanUrl.endsWith('/api/v1')) {
      cleanUrl = `${cleanUrl}/api/v1`;
    }
    return cleanUrl;
  }

  return 'http://localhost:8085/api/v1';
};

export const apiClient = axios.create({
  baseURL: getBaseApiUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string | PromiseLike<string>) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

// Injects Access Token into Headers and ensures dynamic baseURL
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      config.baseURL = getBaseApiUrl();
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepts 401s for Token Refresh Rotation
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 Unauthorized and request hasn't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/login')) {
        // If the login or refresh call itself fails, propagate the error immediately
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        isRefreshing = false;
        // Broadcast custom event or handle redirect in Context Provider
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('auth:logout'));
        }
        return Promise.reject(error);
      }

      try {
        // Calling dynamic endpoint to refresh token with explicit 8s timeout
        const currentApiUrl = getBaseApiUrl();
        const response = await axios.post(`${currentApiUrl}/auth/refresh`, { refreshToken }, { timeout: 8000 });
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

        localStorage.setItem('accessToken', newAccessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        isRefreshing = false;

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        
        // Refresh token expired or invalidated -> cleanly clear stale tokens and trigger logout redirect
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('auth:logout'));
        }
        return Promise.reject(new Error('Session expired. Please log in again.'));
      }
    }

    return Promise.reject(error);
  }
);
