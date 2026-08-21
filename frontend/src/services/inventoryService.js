import api from './api';

export const stockIn = (payload) => api.post('/inventory/stock-in', payload).then((r) => r.data.data);
export const adjustStock = (payload) => api.post('/inventory/adjust', payload).then((r) => r.data.data);
export const getStockHistory = (params) => api.get('/inventory/history', { params }).then((r) => r.data);
export const getLowStock = () => api.get('/inventory/low-stock').then((r) => r.data.data);
