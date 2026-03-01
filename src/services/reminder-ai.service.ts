import { config } from '../config';
import { RoundInfo, ReminderDraft } from '../types/reminder.types';

// ─── Groq API Config ────────────────────────────────────────────────────────

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

// ─── System Prompt (<1000 tokens) ───────────────────────────────────────────

const REMINDER_SYSTEM_PROMPT = `You are a professional event coordinator writing reminder emails for college events.

RULES:
- Professional but friendly tone
- Generic (not tied to any university)
- Plain text only — no emojis, no markdown, no HTML
- Under 400 words per email
- Mention: round name, date, mode, venue (if available)
- End with a clear call to action
- Each email must feel unique, not templated

Return a JSON object with a "reminders" key containing an array:
{ "reminders": [{ "roundName": "...", "roundDate": "...", "subject": "...", "body": "..." }] }

Return ONLY the JSON object. No explanation, no code fences.`;

// ─── Generate Reminder Emails ───────────────────────────────────────────────

export async function generateReminderEmails(
    eventName: string,
    rounds: RoundInfo[]
): Promise<ReminderDraft[]> {
    console.log(`📧 Generating reminder emails for "${eventName}" (${rounds.length} round${rounds.length > 1 ? 's' : ''})`);

    const userPrompt = `Event: ${eventName}

Rounds:
${JSON.stringify(rounds, null, 2)}

Generate one reminder email per round.`;

    const requestBody = {
        model: MODEL,
        messages: [
            { role: 'system', content: REMINDER_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 2048,
        response_format: { type: 'json_object' as const },
    };

    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.groqApiKey}`,
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error(`❌ Groq API ${response.status}:`, errBody);

            // Retry without response_format
            console.log('🔄 Retrying reminder generation without response_format...');
            const retryBody = { ...requestBody } as any;
            delete retryBody.response_format;
            retryBody.messages[0].content += '\n\nCRITICAL: Return ONLY raw JSON array. No code fences, no explanation.';

            const retryResponse = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.groqApiKey}`,
                },
                body: JSON.stringify(retryBody),
            });

            if (!retryResponse.ok) {
                const retryErr = await retryResponse.text();
                throw new Error(`Groq API error (${retryResponse.status}): ${retryErr}`);
            }

            const retryData = await retryResponse.json();
            return parseReminderResponse(retryData);
        }

        const data = await response.json();
        return parseReminderResponse(data);
    } catch (err: any) {
        console.error('❌ Reminder AI call failed:', err.message);
        throw Object.assign(
            new Error(`AI service error: ${err.message}`),
            { statusCode: 502 }
        );
    }
}

// ─── Parse AI Response ──────────────────────────────────────────────────────

function parseReminderResponse(data: any): ReminderDraft[] {
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
        throw Object.assign(new Error('AI returned an empty response.'), { statusCode: 502 });
    }

    let jsonStr = content.trim();
    // Strip thinking tags
    jsonStr = jsonStr.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    // Strip code fences
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();

    let parsed: any;
    try {
        parsed = JSON.parse(jsonStr);
    } catch {
        console.error('❌ Invalid JSON from reminder AI:', jsonStr.substring(0, 300));
        throw Object.assign(new Error('AI returned invalid JSON for reminders.'), { statusCode: 502 });
    }

    // Handle: array, { reminders: [...] }, or { anyKey: [...] }
    let reminders: ReminderDraft[] = [];
    if (Array.isArray(parsed)) {
        reminders = parsed;
    } else if (typeof parsed === 'object' && parsed !== null) {
        // Try common keys first, then find any array
        for (const key of ['reminders', 'data', 'emails', 'results', ...Object.keys(parsed)]) {
            if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
                reminders = parsed[key];
                break;
            }
        }
    }

    if (!reminders.length) {
        console.error('❌ AI returned no reminder array. Raw parsed:', JSON.stringify(parsed).substring(0, 500));
        throw Object.assign(new Error('AI returned zero reminder drafts. Please try again.'), { statusCode: 502 });
    }

    // Validate each draft
    for (const r of reminders) {
        if (!r.roundName || !r.subject || !r.body) {
            throw Object.assign(new Error('AI returned incomplete reminder draft.'), { statusCode: 502 });
        }
    }

    console.log(`✅ Generated ${reminders.length} reminder draft${reminders.length > 1 ? 's' : ''}`);
    return reminders;
}
