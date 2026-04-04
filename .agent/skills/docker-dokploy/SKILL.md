---
name: Despliegue en Docker y Dokploy
description: Checklist y procedimientos para asegurar que el backend compile y se despliegue correctamente en el entorno de Dokploy sin errores de módulos o base de datos.
---

# Procedimientos de Despliegue (Docker/Dokploy)

Al modificar el `Dockerfile` o preparar el código para subir a Dokploy, sigue estas reglas críticas para evitar caídas en producción.

## 1. Prevención del error `MODULE_NOT_FOUND`
- El backend está construido en TypeScript. Docker necesita compilarlo a JavaScript antes de ejecutarlo.
- El `Dockerfile` DEBE incluir un paso de build (ej. `npm run build` o `npx tsc`).
- El comando de inicio (`CMD` o `ENTRYPOINT`) en Docker debe apuntar a la carpeta compilada (`dist/` o `build/`), NO a los archivos `.ts`. Ej: `CMD ["node", "dist/index.js"]`.
- Asegúrate de que el archivo `index.ts` (entry point principal) exista y sea el que arranca el servidor Express.

## 2. Variables de Entorno y Base de Datos (Prisma)
- Revisa que la variable `DATABASE_URL` se lea correctamente en producción.
- **Evita inyectar comillas dobles extra** en los valores de las variables de entorno dentro de Dokploy, ya que Prisma fallará al conectarse a la URL.
- No incluyas archivos `.env` locales en la imagen de Docker (asegúrate de que estén en `.dockerignore`) para evitar colisiones con las variables de Dokploy.

## 3. Logs y Debugging
- En caso de un crasheo al inicio, agrega console.logs tempranos en el archivo `index.ts` (antes de inicializar Prisma o Express) para identificar en qué fase exacta se detiene la ejecución.
