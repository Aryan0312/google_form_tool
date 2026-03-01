import { Request, Response, NextFunction } from 'express';
import { createGoogleForm } from '../services/google-forms.service';
import { FormSchema } from '../types/form.types';

// ─── Allowed field types ────────────────────────────────────────────────────

const ALLOWED_FIELD_TYPES: Set<string> = new Set(['SHORT_ANSWER', 'CHECKBOX', 'FILE_UPLOAD', 'SECTION_HEADER']);
const MAX_FIELDS = 100;

// ─── POST /api/forms/create — Stage 2 ──────────────────────────────────────

export async function createForm(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const schema = req.body as FormSchema;

        // ── Validate required top-level fields ──
        if (!schema.title || typeof schema.title !== 'string') {
            res.status(400).json({ success: false, error: 'Missing or invalid "title".' });
            return;
        }
        if (!schema.fields || !Array.isArray(schema.fields)) {
            res.status(400).json({ success: false, error: 'Missing or invalid "fields" array.' });
            return;
        }

        // ── Validate eventType ──
        if (!['SOLO', 'TEAM'].includes(schema.eventType)) {
            res.status(400).json({ success: false, error: 'eventType must be "SOLO" or "TEAM".' });
            return;
        }

        // ── Validate field count ──
        if (schema.fields.length > MAX_FIELDS) {
            res.status(400).json({ success: false, error: `Too many fields (max ${MAX_FIELDS}).` });
            return;
        }

        // ── Validate each field ──
        for (let i = 0; i < schema.fields.length; i++) {
            const field = schema.fields[i];
            if (!field.label || typeof field.label !== 'string') {
                res.status(400).json({ success: false, error: `Field ${i}: missing or invalid "label".` });
                return;
            }
            if (!ALLOWED_FIELD_TYPES.has(field.type)) {
                res.status(400).json({ success: false, error: `Field ${i}: invalid type "${field.type}". Allowed: ${[...ALLOWED_FIELD_TYPES].join(', ')}` });
                return;
            }
        }

        const result = await createGoogleForm(req, schema);

        res.json({
            success: true,
            data: result,
        });
    } catch (err) {
        next(err);
    }
}
