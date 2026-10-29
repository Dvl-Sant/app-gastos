import { Pool, PoolClient, types } from 'pg';
import { config } from '../config';

// Las columnas DATE deben llegar como string 'YYYY-MM-DD' (no como Date de JS),
// para que las utilidades de calendario trabajen sin zonas horarias.
types.setTypeParser(types.builtins.DATE, (value) => value);

const pool: Pool = new Pool(config.db);

// Un error en un cliente idle no debe tumbar el proceso: el pool se recupera solo.
pool.on('error', (err) => {
    console.error('[DB] Error inesperado en cliente idle:', err);
});

export async function getClient(): Promise<PoolClient> {
    return pool.connect();
}

export default pool;
