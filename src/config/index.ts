import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    groqApiKey: process.env.GROQ_API_KEY || '',
    sessionSecret: process.env.SESSION_SECRET || 'formforge-dev-secret-change-me',
    allowedOrigin: process.env.ALLOWED_ORIGIN || '*',
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
    if (config.nodeEnv === 'production' && config.sessionSecret === 'formforge-dev-secret-change-me') {
        console.error('🔴 SESSION_SECRET must be set in production! Using default is insecure.');
        process.exit(1);
    }
    if (config.nodeEnv === 'production' && config.allowedOrigin === '*') {
        console.warn('⚠️  ALLOWED_ORIGIN is set to * — CORS is wide open. Set this to your domain.');
    }
}
