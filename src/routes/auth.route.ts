import { Router, Request, Response } from 'express';
import { getAuthUrl, handleAuthCallback, isAuthenticated, disconnectGoogle } from '../services/google-auth.service';
import { authRateLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

// Apply rate limiting to all auth routes
router.use(authRateLimiter);

// GET /api/auth/status — Check if Google is connected
router.get('/status', (req: Request, res: Response) => {
    res.json({ authenticated: isAuthenticated(req) });
});

// GET /api/auth/url — Get the OAuth consent URL
router.get('/url', (req: Request, res: Response) => {
    const url = getAuthUrl(req);
    res.json({ url });
});

// GET /api/auth/callback — Handle OAuth redirect
router.get('/callback', async (req: Request, res: Response) => {
    try {
        const code = req.query.code as string;
        const state = req.query.state as string;

        if (!code) {
            res.status(400).send('Missing authorization code.');
            return;
        }
        if (!state) {
            res.status(400).send('Missing state parameter.');
            return;
        }

        await handleAuthCallback(req, code, state);

        // Redirect back to frontend with success indicator
        res.redirect('/?auth=success');
    } catch (err: any) {
        console.error('OAuth callback error:', err.message);
        res.redirect('/?auth=error');
    }
});

// GET /api/auth/disconnect — Revoke tokens and clear session
router.get('/disconnect', async (req: Request, res: Response) => {
    try {
        await disconnectGoogle(req);
        res.json({ success: true, message: 'Google account disconnected.' });
    } catch (err: any) {
        console.error('Disconnect error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to disconnect.' });
    }
});

export default router;
