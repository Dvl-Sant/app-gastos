import { config } from './config';
import app from './app';

app.listen(config.port, () => {
    console.log(`[Server] AppGastos API corriendo en el puerto ${config.port} (${config.nodeEnv})`);
});
