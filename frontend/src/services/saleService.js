import api from './api';

export const createSale = (payload) => api.post('/sales', payload).then((r) => r.data.data);
export const getSales = (params) => api.get('/sales', { params }).then((r) => r.data);
export const getSale = (id) => api.get(`/sales/${id}`).then((r) => r.data.data);
export const createReturn = (payload) => api.post('/returns', payload).then((r) => r.data.data);
export const getReturns = (params) => api.get('/returns', { params }).then((r) => r.data);
