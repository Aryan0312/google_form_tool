import { Request, Response, NextFunction } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

// ─── Global Error Handler ───────────────────────────────────────────────────

export function errorHandler(
    err: any,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    const statusCode = err.statusCode || 500;

    // Always log the full error server-side
    console.error(`❌ [${statusCode}] ${err.message}`);
    if (statusCode === 500) {
        console.error(err.stack);
    }

    // Decide what to send to the client
    let clientMessage: string;
    if (statusCode === 500 && isProduction) {
        // Never leak internal error details in production
        clientMessage = 'An internal error occurred. Please try again later.';
    } else {
        clientMessage = err.message || 'Internal Server Error';
    }

    res.status(statusCode).json({
        success: false,
        error: clientMessage,
    });
}
