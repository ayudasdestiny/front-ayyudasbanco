// Cambia esta URL por la de tu backend desplegado en Render, por ejemplo:
// const API_URL = 'https://ayudasbanco-backend.onrender.com/api';
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:4000/api'
  : 'https://TU-BACKEND-EN-RENDER.onrender.com/api';

const Sesion = {
  guardar(token, usuario) {
    localStorage.setItem('ab_token', token);
    localStorage.setItem('ab_usuario', JSON.stringify(usuario));
  },
  token() {
    return localStorage.getItem('ab_token');
  },
  usuario() {
    try { return JSON.parse(localStorage.getItem('ab_usuario')); } catch { return null; }
  },
  cerrar() {
    localStorage.removeItem('ab_token');
    localStorage.removeItem('ab_usuario');
    window.location.href = 'index.html';
  },
  requerir() {
    if (!this.token()) window.location.href = 'index.html';
  },
};

async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = Sesion.token();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    Sesion.cerrar();
    throw new Error('Sesión expirada');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.mensaje || 'Error en la solicitud');
  return data;
}
