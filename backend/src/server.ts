import { config } from './config';
import app from './app';
import { runMigrations } from './db/migrate';

async function bootstrap() {
    try {
        await runMigrations();
    } catch (error) {
        console.error('[Server] Falló la aplicación de migraciones:', error);
        process.exit(1);
    }
    app.listen(config.port, () => {
        console.log(`[Server] AppGastos API corriendo en el puerto ${config.port} (${config.nodeEnv})`);
    });
}

void bootstrap();
