import api from './api';

// Age Groups
export const getAgeGroups = (params) => api.get('/age-groups', { params }).then((r) => r.data.data);
export const createAgeGroup = (payload) => api.post('/age-groups', payload).then((r) => r.data.data);
export const updateAgeGroup = (id, payload) => api.put(`/age-groups/${id}`, payload).then((r) => r.data.data);
export const deleteAgeGroup = (id) => api.delete(`/age-groups/${id}`).then((r) => r.data);

// Designs
export const getDesigns = (params) => api.get('/designs', { params }).then((r) => r.data.data);
export const createDesign = (formData) =>
  api.post('/designs', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data.data);
export const updateDesign = (id, formData) =>
  api.put(`/designs/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data.data);
export const deleteDesign = (id) => api.delete(`/designs/${id}`).then((r) => r.data);

// Product Types
export const getProductTypes = (params) => api.get('/product-types', { params }).then((r) => r.data.data);
export const createProductType = (payload) => api.post('/product-types', payload).then((r) => r.data.data);
export const updateProductType = (id, payload) => api.put(`/product-types/${id}`, payload).then((r) => r.data.data);
export const deleteProductType = (id) => api.delete(`/product-types/${id}`).then((r) => r.data);

// Colors
export const getColors = (params) => api.get('/colors', { params }).then((r) => r.data.data);
export const createColor = (payload) => api.post('/colors', payload).then((r) => r.data.data);
export const updateColor = (id, payload) => api.put(`/colors/${id}`, payload).then((r) => r.data.data);
export const deleteColor = (id) => api.delete(`/colors/${id}`).then((r) => r.data);
