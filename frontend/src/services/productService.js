import api from './api';

export const getProducts = (params) => api.get('/products', { params }).then((r) => r.data);
export const getProduct = (id) => api.get(`/products/${id}`).then((r) => r.data.data);
export const lookupProduct = (code) => api.get(`/products/lookup/${encodeURIComponent(code)}`).then((r) => r.data.data);
export const createProduct = (payload) => api.post('/products', payload).then((r) => r.data.data);
export const updateProduct = (id, payload) => api.put(`/products/${id}`, payload).then((r) => r.data.data);
export const deleteProduct = (id) => api.delete(`/products/${id}`).then((r) => r.data);
export const clearAllInventory = () => api.delete('/products/clear-all').then((r) => r.data);
export const getProductLabels = (ids) => api.get('/products/labels', { params: { ids: ids.join(',') } }).then((r) => r.data.data);

export const exportInventory = (params) =>
  api.get('/products/export', { params, responseType: 'blob' }).then((r) => r.data);

export const downloadBulkCreateTemplate = () =>
  api.get('/products/bulk-template', { responseType: 'blob' }).then((r) => r.data);

export const bulkCreateProducts = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/products/bulk-upload', formData).then((r) => r.data.data);
};
