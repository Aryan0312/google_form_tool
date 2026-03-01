import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config';
import crypto from 'crypto';
import { Request } from 'express';

// ─── Session Type Extension ─────────────────────────────────────────────────

declare module 'express-session' {
    interface SessionData {
        oauthTokens?: any;
        oauthState?: string;
    }
}

// ─── Create a fresh OAuth2 client per request ───────────────────────────────

function createOAuth2Client(): OAuth2Client {
    return new google.auth.OAuth2(
        config.google.clientId,
        config.google.clientSecret,
        config.google.redirectUri
    );
}

// ─── Generate Auth URL with CSRF State ──────────────────────────────────────

export function getAuthUrl(req: Request): string {
    const client = createOAuth2Client();
    const state = crypto.randomBytes(32).toString('hex');
    req.session.oauthState = state;

    return client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        state,
        scope: [
            'https://www.googleapis.com/auth/forms.body',
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/calendar.events',
        ],
    });
}

// ─── Handle OAuth Callback (validates state, stores tokens in session) ──────

export async function handleAuthCallback(req: Request, code: string, state: string): Promise<void> {
    // Validate CSRF state
    if (!req.session.oauthState || req.session.oauthState !== state) {
        throw new Error('Invalid OAuth state parameter. Possible CSRF attack.');
    }

    // Clear the state after validation
    delete req.session.oauthState;

    const client = createOAuth2Client();
    const { tokens } = await client.getToken(code);
    req.session.oauthTokens = tokens;
    console.log('✅ Google OAuth tokens acquired for session.');
}

// ─── Check Auth Status (per session) ────────────────────────────────────────

export function isAuthenticated(req: Request): boolean {
    return !!req.session.oauthTokens;
}

// ─── Get Authenticated Client (reads tokens from session) ───────────────────

export function getAuthenticatedClient(req: Request): OAuth2Client {
    if (!req.session.oauthTokens) {
        throw Object.assign(
            new Error('Not authenticated with Google. Please connect your Google account first.'),
            { statusCode: 401 }
        );
    }
    const client = createOAuth2Client();
    client.setCredentials(req.session.oauthTokens);
    return client;
}

// ─── Disconnect Google (revoke + clear session) ─────────────────────────────

export async function disconnectGoogle(req: Request): Promise<void> {
    if (req.session.oauthTokens) {
        try {
            const client = createOAuth2Client();
            client.setCredentials(req.session.oauthTokens);
            await client.revokeCredentials();
        } catch (err) {
            console.warn('⚠️ Token revocation failed (token may already be expired):', (err as Error).message);
        }
    }
    delete req.session.oauthTokens;
}
