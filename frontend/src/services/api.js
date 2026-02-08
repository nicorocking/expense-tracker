import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
});

// Interceptor para agregar token a todas las peticiones
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const register = (userData) => api.post('/auth/register', userData);
export const login = (credentials) => api.post('/auth/login', credentials);

// Expenses
export const createExpense = (formData) => api.post('/expenses', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const getExpenses = (params) => api.get('/expenses', { params });
export const getExpense = (id) => api.get(`/expenses/${id}`);
export const updateExpense = (id, data) => api.put(`/expenses/${id}`, data);
export const deleteExpense = (id) => api.delete(`/expenses/${id}`);

// Reports
export const getMonthlyReport = (year, month) => api.get('/reports/monthly', { params: { year, month } });
export const getAnnualReport = (year) => api.get('/reports/annual', { params: { year } });

// Dashboard
export const getDashboard = () => api.get('/dashboard');

// Exchange Rates
export const getCurrentRates = () => api.get('/exchange-rates/current');
export const getRatesByDate = (date) => api.get(`/exchange-rates/${date}`);

export default api;
