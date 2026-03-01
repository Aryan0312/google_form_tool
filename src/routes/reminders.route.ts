import { Router } from 'express';
import { previewReminders, createReminders } from '../controllers/reminders.controller';
import { aiRateLimiter, reminderCreateLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

// POST /api/reminders/preview — AI-only preview (lightweight)
router.post('/preview', aiRateLimiter, previewReminders);

// POST /api/reminders/create — Drive + Calendar (heavy)
router.post('/create', reminderCreateLimiter, createReminders);

export default router;
