import { Request, Response, NextFunction } from 'express';

export function validateBody(allowedFields: readonly string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        const body = req.body;
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
