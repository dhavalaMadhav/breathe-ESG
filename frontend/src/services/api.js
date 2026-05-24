import axios from 'axios';

// Create a direct, lightweight Axios instance targeting local Django API proxy
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Automatically inject JWT Bearer token into outgoing requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('esg_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
