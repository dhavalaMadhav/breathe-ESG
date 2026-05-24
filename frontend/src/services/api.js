import axios from 'axios';

// Create a direct, lightweight Axios instance targeting local Django API proxy
const api = axios.create({
  baseURL: 'https://breathe-esg-6fzp.onrender.com/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

export default api;
