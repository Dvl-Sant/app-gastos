import { clearSession } from '../auth/session';

const BASE_URL = '/api';

export class ApiError extends Error {
    constructor(
        public status: number,
        message: string
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('token');
    const headers = new Headers(options.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (options.body) headers.set('Content-Type', 'application/json');

    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

    if (res.status === 401 || res.status === 403) {
        clearSession();
        window.location.href = '/login';
        throw new ApiError(res.status, 'Tu sesión expiró. Inicia sesión de nuevo.');
    }

    if (!res.ok) {
        let message = 'Error inesperado del servidor';
        try {
            const body = (await res.json()) as { message?: string; error?: string };
            message = body.message || body.error || message;
        } catch {
            // respuesta sin cuerpo JSON
        }
        throw new ApiError(res.status, message);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
}
