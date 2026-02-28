import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config';

// ─── OAuth2 Client Singleton ────────────────────────────────────────────────

let oauth2Client: OAuth2Client | null = null;
let storedTokens: any = null;

export function getOAuth2Client(): OAuth2Client {
    if (!oauth2Client) {
        oauth2Client = new google.auth.OAuth2(
            config.google.clientId,
            config.google.clientSecret,
            config.google.redirectUri
        );

        // Restore tokens if we have them
        if (storedTokens) {
            oauth2Client.setCredentials(storedTokens);
        }
    }
    return oauth2Client;
}

// ─── Generate Auth URL ──────────────────────────────────────────────────────

export function getAuthUrl(): string {
    const client = getOAuth2Client();
    return client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: [
            'https://www.googleapis.com/auth/forms.body',
        ],
    });
}

// ─── Handle OAuth Callback ──────────────────────────────────────────────────

export async function handleAuthCallback(code: string): Promise<void> {
    const client = getOAuth2Client();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);
    storedTokens = tokens;
    console.log('✅ Google OAuth tokens acquired successfully.');
}

// ─── Check Auth Status ──────────────────────────────────────────────────────

export function isAuthenticated(): boolean {
    return storedTokens !== null;
}

// ─── Get Authenticated Client (throws if not authed) ────────────────────────

export function getAuthenticatedClient(): OAuth2Client {
    if (!storedTokens) {
        throw Object.assign(
            new Error('Not authenticated with Google. Please connect your Google account first.'),
            { statusCode: 401 }
        );
    }
    const client = getOAuth2Client();
    client.setCredentials(storedTokens);
    return client;
}
