import { Router } from 'express';
import { generateFormSchema } from '../controllers/generate.controller';
import { aiRateLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

// POST /api/generate — Stage 1: raw text → FormSchema
router.post('/', aiRateLimiter, generateFormSchema);

export default router;
