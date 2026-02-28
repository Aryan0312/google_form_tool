import { Router } from 'express';
import { generateFormSchema } from '../controllers/generate.controller';

const router = Router();

// POST /api/generate — Stage 1: raw text → FormSchema
router.post('/', generateFormSchema);

export default router;
