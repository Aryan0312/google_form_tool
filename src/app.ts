import express from 'express';
import cors from 'cors';
import path from 'path';
import helmet from 'helmet';
import session from 'express-session';
import { config } from './config';

import generateRoute from './routes/generate.route';
import formsRoute from './routes/forms.route';
import authRoute from './routes/auth.route';
import { errorHandler } from './middleware/error.middleware';

// ─── Express App ────────────────────────────────────────────────────────────

const app = express();

// ─── Security Headers ──────────────────────────────────────────────────────

app.use(helmet({
    contentSecurityPolicy: false, // Allow inline scripts for the frontend
    crossOriginEmbedderPolicy: false,
}));

// ─── Trust Proxy (for rate limiting behind Nginx) ───────────────────────────

if (config.nodeEnv === 'production') {
    app.set('trust proxy', 1);
}

// ─── CORS ───────────────────────────────────────────────────────────────────

app.use(cors({
    origin: config.allowedOrigin === '*' ? true : config.allowedOrigin,
    credentials: true,
}));

// ─── Session (encrypted cookie-based) ──────────────────────────────────────

app.use(session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    name: 'formforge.sid',
    cookie: {
        secure: config.nodeEnv === 'production',
        httpOnly: true,
        maxAge: 2 * 60 * 60 * 1000, // 2 hours
        sameSite: 'lax',
    },
}));

// ─── Body Parsing ──────────────────────────────────────────────────────────

app.use(express.json({ limit: '1mb' }));

// ─── Static Frontend ───────────────────────────────────────────────────────

app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── API Routes ─────────────────────────────────────────────────────────────

app.use('/api/generate', generateRoute);
app.use('/api/forms', formsRoute);
app.use('/api/auth', authRoute);

// ─── Health Check ───────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Global Error Handler (must be last) ────────────────────────────────────

app.use(errorHandler);

export default app;
