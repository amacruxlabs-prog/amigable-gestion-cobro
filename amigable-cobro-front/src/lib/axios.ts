/// <reference types="vite/client" />
import axios from 'axios';

const globalToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'error') => {
  window.dispatchEvent(new CustomEvent('global-toast', { detail: { message, type } }));
};

const globalAlert = (message: string, title: string = 'Atención', type: 'success' | 'error' | 'info' | 'warning' | 'danger' = 'error') => {
  window.dispatchEvent(new CustomEvent('global-alert', { detail: { message, title, type } }));
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Interceptor de solicitudes (inyectar token)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor de respuestas (manejo global de errores)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si la API arroja un error estándar de validación o del servidor
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      // Errores de validación (422) normalmente se manejan en el propio formulario (Formik)
      // pero igual podemos soltar un toast genérico o dejarlo al formulario
      if (status === 422) {
        globalAlert('Por favor, verifica los campos del formulario. Hay información incompleta o incorrecta.', 'Validación Fallida', 'warning');
      } 
      else if (status === 401) {
        globalAlert(data.message || 'Credenciales inválidas o sesión expirada.', 'Acceso Denegado', 'danger');
        localStorage.removeItem('auth_token');
      }
      else if (status >= 500) {
        globalToast('Error del servidor. Por favor intenta de nuevo.', 'error');
      }
      else {
        globalToast(data.message || 'Ha ocurrido un error inesperado.', 'error');
      }
    } else if (error.request) {
      globalToast('No se pudo conectar con el servidor.', 'error');
    } else {
      globalToast('Ocurrió un error: ' + error.message, 'error');
    }
    return Promise.reject(error);
  }
);
