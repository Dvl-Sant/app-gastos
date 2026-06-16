import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

pg.types.setTypeParser(pg.types.builtins.NUMERIC, (val: string) => val === null ? null : parseFloat(val));

const pool: Pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'appgastos',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

export async function getClient(): Promise<PoolClient> {
    return pool.connect();
}

export default pool;
