
import axios from 'axios';

// Dynamically use the host IP so both Mac and iPhone connect properly
const host = window.location.hostname || 'localhost';

const API = axios.create({
  baseURL: `http://${host}:5001/api`,
  timeout: 8000, // 8-second timeout prevents infinite hanging
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem('payflow_token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export default API;