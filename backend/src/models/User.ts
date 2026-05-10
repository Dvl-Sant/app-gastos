export interface User {
    id: number;
    username: string;
    password_hash: string;
    created_at: Date;
}

export interface JwtPayload {
    id: number;
    username: string;
}
