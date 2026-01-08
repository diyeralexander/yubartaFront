/**
 * API Service Layer
 * Handles all communication with the backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Generic fetch wrapper with error handling
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// ============ AUTH ============
export const authAPI = {
  login: (email: string, password: string) =>
    fetchAPI<{ user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (userData: {
    name: string;
    email: string;
    password: string;
    role: string;
    city?: string;
    department?: string;
    buyerType?: string;
  }) =>
    fetchAPI<{ user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
};

// ============ USERS ============
export const usersAPI = {
  getAll: () => fetchAPI<any[]>('/users'),

  getById: (id: string) => fetchAPI<any>(`/users/${id}`),

  update: (id: string, data: any) =>
    fetchAPI<any>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchAPI<{ success: boolean }>(`/users/${id}`, {
      method: 'DELETE',
    }),
};

// ============ REQUIREMENTS (Module 1) ============
export const requirementsAPI = {
  getAll: () => fetchAPI<any[]>('/requirements'),

  getById: (id: string) => fetchAPI<any>(`/requirements/${id}`),

  create: (data: any) =>
    fetchAPI<any>('/requirements', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    fetchAPI<any>(`/requirements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchAPI<{ success: boolean }>(`/requirements/${id}`, {
      method: 'DELETE',
    }),
};

// ============ OFFERS (Module 1) ============
export const offersAPI = {
  getAll: () => fetchAPI<any[]>('/offers'),

  getById: (id: string) => fetchAPI<any>(`/offers/${id}`),

  create: (data: any) =>
    fetchAPI<any>('/offers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    fetchAPI<any>(`/offers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchAPI<{ success: boolean }>(`/offers/${id}`, {
      method: 'DELETE',
    }),
};

// ============ COMMITMENTS ============
export const commitmentsAPI = {
  getAll: () => fetchAPI<any[]>('/commitments'),

  getById: (id: string) => fetchAPI<any>(`/commitments/${id}`),

  create: (data: any) =>
    fetchAPI<any>('/commitments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    fetchAPI<any>(`/commitments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchAPI<{ success: boolean }>(`/commitments/${id}`, {
      method: 'DELETE',
    }),
};

// ============ LISTINGS (Module 2) ============
export const listingsAPI = {
  getAll: () => fetchAPI<any[]>('/listings'),

  getById: (id: string) => fetchAPI<any>(`/listings/${id}`),

  create: (data: any) =>
    fetchAPI<any>('/listings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    fetchAPI<any>(`/listings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchAPI<{ success: boolean }>(`/listings/${id}`, {
      method: 'DELETE',
    }),
};

// ============ PURCHASE OFFERS (Module 2) ============
export const purchaseOffersAPI = {
  getAll: () => fetchAPI<any[]>('/purchase-offers'),

  getById: (id: string) => fetchAPI<any>(`/purchase-offers/${id}`),

  create: (data: any) =>
    fetchAPI<any>('/purchase-offers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    fetchAPI<any>(`/purchase-offers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchAPI<{ success: boolean }>(`/purchase-offers/${id}`, {
      method: 'DELETE',
    }),
};

// ============ HEALTH CHECK ============
export const healthAPI = {
  check: () => fetchAPI<{ status: string; timestamp: string }>('/health'),
};

// Export all APIs
export const api = {
  auth: authAPI,
  users: usersAPI,
  requirements: requirementsAPI,
  offers: offersAPI,
  commitments: commitmentsAPI,
  listings: listingsAPI,
  purchaseOffers: purchaseOffersAPI,
  health: healthAPI,
};

export default api;
