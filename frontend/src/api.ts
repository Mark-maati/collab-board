import { API_URL } from './config';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/';
    }
    
    let message = 'Request failed';
    try {
      const data = await response.json();
      message = data.detail || message;
    } catch {
      // ignore JSON parse error
    }
    
    throw new ApiError(response.status, message);
  }
  
  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }
  
  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  
  post: <T>(endpoint: string, data?: unknown) => 
    request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),
  
  patch: <T>(endpoint: string, data: unknown) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
};

export { ApiError };
