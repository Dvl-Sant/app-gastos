import { Request, Response, NextFunction } from 'express';

/**
 * Filtra el body dejando solo los campos permitidos y valida presencia de los requeridos.
 * requiredFields solo aplica cuando el campo viene "ausente" (undefined/null/''):
 * en PUT basta con enviar los campos que se quieren cambiar.
 */
export function validateBody(allowedFields: readonly string[], requiredFields: readonly string[] = []) {
    return (req: Request, res: Response, next: NextFunction) => {
        const body = req.body ?? {};

        const missing = requiredFields.filter(
            (key) => body[key] === undefined || body[key] === null || body[key] === ''
        );
        if (missing.length > 0) {
            return res.status(400).json({
                status: 'error',
                message: `Campos requeridos faltantes o vacíos: ${missing.join(', ')}`
            });
        }

        const sanitized: Record<string, unknown> = {};
        for (const key of allowedFields) {
            if (body[key] !== undefined) {
                sanitized[key] = body[key];
            }
        }

        req.body = sanitized;
        next();
    };
}
