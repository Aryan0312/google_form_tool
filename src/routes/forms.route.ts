import { Router } from 'express';
import { createForm } from '../controllers/forms.controller';

const router = Router();

// POST /api/forms/create — Stage 2: FormSchema → Google Form
router.post('/create', createForm);

export default router;
