import express from 'express';
import cors from 'cors';
import path from 'path';

import generateRoute from './routes/generate.route';
import formsRoute from './routes/forms.route';
import authRoute from './routes/auth.route';
import { errorHandler } from './middleware/error.middleware';

// ─── Express App ────────────────────────────────────────────────────────────

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Serve static frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes
app.use('/api/generate', generateRoute);
app.use('/api/forms', formsRoute);
app.use('/api/auth', authRoute);

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler (must be last)
app.use(errorHandler);

export default app;
