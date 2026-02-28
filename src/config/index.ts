import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: parseInt(process.env.PORT || '3000', 10),
    groqApiKey: process.env.GROQ_API_KEY || '',
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback',
    },
} as const;

export function validateConfig(): void {
    if (!config.groqApiKey) {
        console.warn('⚠️  GROQ_API_KEY not set — Stage 1 (AI parsing) will fail.');
    }
    if (!config.google.clientId || !config.google.clientSecret) {
        console.warn('⚠️  Google OAuth credentials not set — Stage 2 (form creation) will fail.');
    }
}
