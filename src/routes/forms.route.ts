import { Router } from 'express';
import { createForm } from '../controllers/forms.controller';
import { formRateLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

// POST /api/forms/create — Stage 2: FormSchema → Google Form
router.post('/create', formRateLimiter, createForm);

export default router;
