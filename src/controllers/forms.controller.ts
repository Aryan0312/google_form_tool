import { Request, Response, NextFunction } from 'express';
import { createGoogleForm } from '../services/google-forms.service';
import { FormSchema } from '../types/form.types';

// ─── POST /api/forms/create — Stage 2 ──────────────────────────────────────

export async function createForm(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const schema = req.body as FormSchema;

        // Validate minimal required fields
        if (!schema.title || !schema.fields || !Array.isArray(schema.fields)) {
            res.status(400).json({
                success: false,
                error: 'Invalid form schema. Required: title, fields[].',
            });
            return;
        }

        const result = await createGoogleForm(schema);

        res.json({
            success: true,
            data: result,
        });
    } catch (err) {
        next(err);
    }
}
