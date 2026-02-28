import { Request, Response, NextFunction } from 'express';
import { parseEventText } from '../services/ai.service';

// ─── POST /api/generate — Stage 1 ──────────────────────────────────────────

export async function generateFormSchema(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { text } = req.body;

        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            res.status(400).json({
                success: false,
                error: 'Request body must include a non-empty "text" field.',
            });
            return;
        }

        const schema = await parseEventText(text);

        res.json({
            success: true,
            data: schema,
        });
    } catch (err) {
        next(err);
    }
}
