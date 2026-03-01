import { Request, Response, NextFunction } from 'express';
import { parseEventText } from '../services/ai.service';

// ─── Limits ─────────────────────────────────────────────────────────────────

const MAX_TEXT_LENGTH = 15000; // chars — enough for any event page
const MAX_CUSTOM_FIELDS_LENGTH = 2000;

// ─── Sanitize HTML tags from input ──────────────────────────────────────────

function stripHtml(str: string): string {
    return str.replace(/<[^>]*>/g, '');
}

// ─── POST /api/generate — Stage 1 ──────────────────────────────────────────

export async function generateFormSchema(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { text, customFields, requiredFields } = req.body;

        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            res.status(400).json({
                success: false,
                error: 'Request body must include a non-empty "text" field.',
            });
            return;
        }

        if (text.length > MAX_TEXT_LENGTH) {
            res.status(400).json({
                success: false,
                error: `Event text is too long (max ${MAX_TEXT_LENGTH} characters).`,
            });
            return;
        }

        // Sanitize inputs
        const safeText = stripHtml(text);
        const safeCustomFields = customFields ? stripHtml(String(customFields)).substring(0, MAX_CUSTOM_FIELDS_LENGTH) : '';
        const safeRequiredFields = requiredFields ? stripHtml(String(requiredFields)).substring(0, MAX_CUSTOM_FIELDS_LENGTH) : '';

        const schema = await parseEventText(
            safeText,
            safeCustomFields,
            safeRequiredFields
        );

        res.json({
            success: true,
            data: schema,
        });
    } catch (err) {
        next(err);
    }
}
