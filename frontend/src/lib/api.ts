/**
 * API utility to handle authenticated requests
 * Automatically adds JWT token to all API calls
 */

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

export const api = {
  get: async (url: string, options?: RequestInit) => {
    return fetch(url, {
      ...options,
      method: 'GET',
      headers: {
        ...getAuthHeaders(),
        ...options?.headers,
      },
    });
  },

  post: async (url: string, body?: any, options?: RequestInit) => {
    return fetch(url, {
      ...options,
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put: async (url: string, body?: any, options?: RequestInit) => {
    return fetch(url, {
      ...options,
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete: async (url: string, options?: RequestInit) => {
    return fetch(url, {
      ...options,
      method: 'DELETE',
      headers: {
        ...getAuthHeaders(),
        ...options?.headers,
      },
    });
  },
};

