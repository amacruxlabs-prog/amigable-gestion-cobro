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

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

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

// Interceptor de respuestas (manejo global de errores y refresh de token)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si la API arroja un error estándar de validación o del servidor
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      // Si es 401 y no es un reintento y no es la ruta de login o refresh
      if (
        status === 401 &&
        !originalRequest._retry &&
        !originalRequest.url?.includes('/auth/login') &&
        !originalRequest.url?.includes('/auth/refresh')
      ) {
        originalRequest._retry = true;

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return api(originalRequest);
            })
            .catch((err) => {
              return Promise.reject(err);
            });
        }

        isRefreshing = true;

        try {
          // Intentamos refrescar el token
          const response = await api.post('/auth/refresh');
          const newToken = response.data?.data?.access_token;

          if (newToken) {
            localStorage.setItem('auth_token', newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            processQueue(null, newToken);

            // Disparar evento para notificar al contexto si es necesario
            window.dispatchEvent(new CustomEvent('auth-token-refreshed', { detail: { token: newToken } }));

            return api(originalRequest);
          } else {
            throw new Error('Token no recibido del servidor.');
          }
        } catch (refreshError) {
          processQueue(refreshError, null);
          localStorage.removeItem('auth_token');
          window.dispatchEvent(new CustomEvent('auth-session-expired'));
          globalAlert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 'Sesión Expirada', 'danger');
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // Errores de validación (422) normalmente se manejan en el propio formulario (Formik)
      if (status === 422) {
        globalAlert('Por favor, verifica los campos del formulario. Hay información incompleta o incorrecta.', 'Validación Fallida', 'warning');
      } 
      else if (status === 401) {
        // Si falló login o refresh, o si es un 401 que ya reintentamos
        if (originalRequest.url?.includes('/auth/login')) {
          globalAlert(data.message || 'Credenciales inválidas.', 'Acceso Denegado', 'danger');
        } else if (!originalRequest.url?.includes('/auth/logout')) {
          localStorage.removeItem('auth_token');
          window.dispatchEvent(new CustomEvent('auth-session-expired'));
          globalAlert(data.message || 'Sesión expirada.', 'Acceso Denegado', 'danger');
        }
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
