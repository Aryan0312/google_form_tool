import { Request, Response, NextFunction } from 'express';

// ─── Global Error Handler ───────────────────────────────────────────────────

export function errorHandler(
    err: any,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    console.error(`❌ [${statusCode}] ${message}`);
    if (statusCode === 500) {
        console.error(err.stack);
    }

    res.status(statusCode).json({
        success: false,
        error: message,
    });
}
