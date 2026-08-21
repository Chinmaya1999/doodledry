import api from './api';

export const getDashboard = (params) => api.get('/reports/dashboard', { params }).then((r) => r.data.data);
export const getSalesReport = (params) => api.get('/reports/sales', { params }).then((r) => r.data.data);
export const getInventoryReport = () => api.get('/reports/inventory').then((r) => r.data.data);
export const getDesignReport = () => api.get('/reports/designs').then((r) => r.data.data);
export const getAgeGroupReport = () => api.get('/reports/age-groups').then((r) => r.data.data);
export const getProductTypeReport = () => api.get('/reports/product-types').then((r) => r.data.data);
export const getColorReport = () => api.get('/reports/colors').then((r) => r.data.data);
