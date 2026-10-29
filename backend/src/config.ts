import dotenv from 'dotenv';
import type { SignOptions } from 'jsonwebtoken';

// Debe ser el primer módulo importado por el punto de entrada,
// para que todas las lecturas de process.env vean el .env cargado.
dotenv.config();

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error(`[Config] La variable de entorno requerida ${name} no está definida`);
        }
        console.warn(`[Config] ${name} no definida, usando valor por defecto de desarrollo`);
        return 'dev-insecure-default-change-me';
    }
    return value;
}

export const config = {
    port: parseInt(process.env.PORT || '3002', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'appgastos',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
    },
    jwtSecret: requireEnv('JWT_SECRET'),
    jwtExpiresIn: (process.env.JWT_EXPIRES_IN || '24h') as SignOptions['expiresIn'],
    // '*' permite cualquier origen (local); en producción fijar CORS_ORIGIN=https://midominio.com
    corsOrigin: process.env.CORS_ORIGIN || '*',
} as const;
