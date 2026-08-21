import api from './api';

export const getUsers = (params) => api.get('/users', { params }).then((r) => r.data);
export const createUser = (payload) => api.post('/users', payload).then((r) => r.data.data);
export const updateUser = (id, payload) => api.put(`/users/${id}`, payload).then((r) => r.data.data);
export const deleteUser = (id) => api.delete(`/users/${id}`).then((r) => r.data);
