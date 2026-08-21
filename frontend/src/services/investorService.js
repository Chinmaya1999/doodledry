import api from './api';

export const getInvestors = (params) => api.get('/investors', { params }).then((r) => r.data);
export const getInvestor = (id) => api.get(`/investors/${id}`).then((r) => r.data.data);
export const createInvestor = (payload) => api.post('/investors', payload).then((r) => r.data.data);
export const updateInvestor = (id, payload) => api.put(`/investors/${id}`, payload).then((r) => r.data.data);
export const addInvestorTransaction = (id, payload) => api.post(`/investors/${id}/transactions`, payload).then((r) => r.data.data);
