import { Router, Request, Response } from 'express';
import { getAuthUrl, handleAuthCallback, isAuthenticated } from '../services/google-auth.service';

const router = Router();

// GET /api/auth/status — Check if Google is connected
router.get('/status', (_req: Request, res: Response) => {
    res.json({ authenticated: isAuthenticated() });
});

// GET /api/auth/url — Get the OAuth consent URL
router.get('/url', (_req: Request, res: Response) => {
    const url = getAuthUrl();
    res.json({ url });
});

// GET /api/auth/callback — Handle OAuth redirect
router.get('/callback', async (req: Request, res: Response) => {
    try {
        const code = req.query.code as string;
        if (!code) {
            res.status(400).send('Missing authorization code.');
            return;
        }
        await handleAuthCallback(code);

        // Redirect back to frontend with success indicator
        res.redirect('/?auth=success');
    } catch (err: any) {
        console.error('OAuth callback error:', err);
        res.redirect('/?auth=error');
    }
});

export default router;
