import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' }
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (userData) => API.post('/auth/register', userData),
  login: (email, password) => API.post('/auth/login', { email, password }),
  getMe: () => API.get('/auth/me'),
};

export const eventAPI = {
  getAllEvents: () => API.get('/events'),
  getEventById: (id) => API.get(`/events/${id}`),
  createEvent: (eventData) => API.post('/events', eventData),
  updateEvent: (id, eventData) => API.put(`/events/${id}`, eventData),
  deleteEvent: (id) => API.delete(`/events/${id}`),
  
  // NEW: Registration endpoints
  registerEvent: (eventId) => API.post(`/events/${eventId}/register`),
  unregisterEvent: (eventId) => API.post(`/events/${eventId}/unregister`),
  getMyRegistrations: () => API.get('/events/my-events/registered'),
  getEventParticipants: (eventId) => API.get(`/events/${eventId}/participants`),
};


export default API;
