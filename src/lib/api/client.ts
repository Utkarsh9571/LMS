/**
 * Generic API Client for LMS Frontend
 *
 * Market Authority Policy:
 * Market resolution is strictly a server/middleware concern (determined via hostname,
 * geolocation, or server configuration). This client utility does NOT set x-market-code,
 * resolve hostnames, or act as a market authority.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export async function apiGet<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options?.headers) {
    Object.assign(headers, options.headers);
  }

  const res = await fetch(endpoint, {
    
    headers,
  });

  const json: ApiResponse<T> = await res.json();
  if (!res.ok || !json.success) {
    throw new ApiError(res.status, json.error?.message || 'API request failed', json.error?.details);
  }

  return json.data as T;
}

export async function apiPost<T>(endpoint: string, data: unknown, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options?.headers) {
    Object.assign(headers, options.headers);
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
    
    headers,
  });

  const json: ApiResponse<T> = await res.json();
  if (!res.ok || !json.success) {
    throw new ApiError(res.status, json.error?.message || 'API request failed', json.error?.details);
  }

  return json.data as T;
}
