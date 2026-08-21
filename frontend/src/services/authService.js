import api, { setAuthToken } from './api';

export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password });
  if (data.data?.token) setAuthToken(data.data.token);
  return data.data.user;
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } finally {
    setAuthToken(null);
  }
}

export async function fetchCurrentUser() {
  const { data } = await api.get('/auth/me');
  return data.data.user;
}
