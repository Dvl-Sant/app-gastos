import type { User } from '../types';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export interface Session {
    token: string;
    user: User;
}

export function getSession(): Session | null {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    try {
        const raw = localStorage.getItem(USER_KEY);
        const user = raw ? (JSON.parse(raw) as User) : null;
        if (!user) return null;
        return { token, user };
    } catch {
        clearSession();
        return null;
    }
}

export function setSession(token: string, user: User): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}
