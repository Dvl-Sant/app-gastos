import fs from 'fs';
import path from 'path';
import pool from './pool';

/**
 * Runner de migraciones: aplica en orden los .sql de db/migrations que
 * falten (registro en _migrations). Los archivos deben ser idempotentes
 * (IF NOT EXISTS / guards) para poder re-ejecutarse sin daño.
 * En desarrollo resuelve src/db/migrations; en producción el Dockerfile
 * copia las migraciones a <root>/migrations.
 */
function migrationsDir(): string | null {
    const candidates = [
        path.join(__dirname, '../../migrations'), // prod: dist/db -> <root>/migrations
        path.join(__dirname, 'migrations'), // dev: src/db -> src/db/migrations
    ];
    return candidates.find((c) => fs.existsSync(c)) ?? null;
}

export async function runMigrations(): Promise<void> {
    const dir = migrationsDir();
    if (!dir) {
        console.warn('[Migrate] No se encontró la carpeta de migraciones; omitiendo');
        return;
    }

    await pool.query(
        `CREATE TABLE IF NOT EXISTS _migrations (
            name VARCHAR(255) PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`
    );

    const { rows } = await pool.query('SELECT name FROM _migrations');
    const applied = new Set(rows.map((r) => r.name));

    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
    const client = await pool.connect();
    try {
        for (const file of files) {
            if (applied.has(file)) continue;
            const sql = fs.readFileSync(path.join(dir, file), 'utf8');
            console.log(`[Migrate] Aplicando ${file}...`);
            await client.query('BEGIN');
            try {
                await client.query(sql);
                await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
                await client.query('COMMIT');
                console.log(`[Migrate] ${file} aplicada`);
            } catch (error) {
                await client.query('ROLLBACK');
                console.error(`[Migrate] ERROR en ${file}:`, error instanceof Error ? error.message : error);
                throw error;
            }
        }
    } finally {
        client.release();
    }
}
