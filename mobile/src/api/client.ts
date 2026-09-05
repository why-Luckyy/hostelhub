import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Storage Keys
export const AUTH_TOKEN_KEY = 'hostelhub_access_token';
export const REFRESH_TOKEN_KEY = 'hostelhub_refresh_token';

// Request Interceptor: Attach Bearer Token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('SecureStore error reading auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle Token Expiration
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      error.response?.data?.error?.code === 'TOKEN_EXPIRED'
    ) {
      originalRequest._retry = true;
      try {
        const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        if (refreshToken) {
          // In Phase 2: refresh call will exchange refreshToken for new accessToken
          // const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          // await SecureStore.setItemAsync(AUTH_TOKEN_KEY, res.data.data.accessToken);
          // return apiClient(originalRequest);
        }
      } catch (refreshError) {
        await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
