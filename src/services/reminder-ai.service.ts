import { config } from '../config';
import { RoundInfo, ReminderDraft } from '../types/reminder.types';

// ─── Groq API Config ────────────────────────────────────────────────────────

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

// ─── System Prompt ──────────────────────────────────────────────────────────

const REMINDER_SYSTEM_PROMPT = `You write official college reminder emails to students about upcoming third-party events.

CONTEXT:
- You are a college administration sending a reminder to students.
- The event is organized by a third party, not the college.
- The email is sent ONE DAY BEFORE the round.
- Written in THIRD PERSON (the college addressing students).

RULES:
- Official, respectful tone. No casualness.
- Plain text only — no emojis, no markdown, no HTML.
- Under 400 words.
- Clearly state: round name, date (tomorrow), time, mode, venue (if available).
- Remind students to be prepared and attend on time.
- End with a professional sign-off like "Wishing you the best" or "We wish all participants good luck."
- Do NOT mention the college name — keep it generic.

Return a JSON object:
{ "reminders": [{ "roundName": "...", "roundDate": "...", "subject": "...", "body": "..." }] }

ONE email per round. Return ONLY the JSON. No explanation.`;

// ─── Generate Reminder Emails ───────────────────────────────────────────────

export async function generateReminderEmails(
    eventName: string,
    rounds: RoundInfo[]
): Promise<ReminderDraft[]> {
    console.log(`📧 Generating reminder emails for "${eventName}" (${rounds.length} round${rounds.length > 1 ? 's' : ''})`);

    const userPrompt = `Event: ${eventName}

Rounds:
${JSON.stringify(rounds, null, 2)}

Generate ONE reminder email per round. Each email reminds students that the round is TOMORROW.`;

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
            retryBody.messages[0].content += '\n\nCRITICAL: Return ONLY raw JSON object. No code fences, no explanation.';

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
    jsonStr = jsonStr.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
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
