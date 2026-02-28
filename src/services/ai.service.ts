import Groq from 'groq-sdk';
import { config } from '../config';
import { FormSchema } from '../types/form.types';
import { STAGE1_SYSTEM_PROMPT, buildStage1UserPrompt } from '../prompts/stage1.prompt';

// ─── Groq Client (Llama 3.1 8B) ────────────────────────────────────────────

const groq = new Groq({ apiKey: config.groqApiKey });
const MODEL = 'llama-3.1-8b-instant'; // lightweight, fast, free-tier

// ─── Stage 1: Parse Event Text → FormSchema ────────────────────────────────

export async function parseEventText(rawText: string): Promise<FormSchema> {
    if (!rawText || rawText.trim().length === 0) {
        throw Object.assign(new Error('Event text cannot be empty.'), { statusCode: 400 });
    }

    const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
            { role: 'system', content: STAGE1_SYSTEM_PROMPT },
            { role: 'user', content: buildStage1UserPrompt(rawText) },
        ],
        temperature: 0.1,       // low temp for deterministic structured output
        max_tokens: 4096,
        response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
        throw Object.assign(new Error('AI returned an empty response.'), { statusCode: 502 });
    }

    // Parse and validate
    let schema: FormSchema;
    try {
        schema = JSON.parse(content) as FormSchema;
    } catch {
        throw Object.assign(
            new Error(`AI returned invalid JSON: ${content.substring(0, 200)}`),
            { statusCode: 502 }
        );
    }

    // Basic structural validation
    if (!schema.title || !schema.fields || !Array.isArray(schema.fields)) {
        throw Object.assign(
            new Error('AI response missing required fields (title, fields).'),
            { statusCode: 502 }
        );
    }

    // Ensure valid eventType
    if (!['SOLO', 'TEAM'].includes(schema.eventType)) {
        schema.eventType = schema.maxParticipants > 1 ? 'TEAM' : 'SOLO';
    }

    // Ensure maxParticipants is a number
    if (typeof schema.maxParticipants !== 'number' || schema.maxParticipants < 1) {
        schema.maxParticipants = 1;
    }

    // Ensure minParticipants is a number and valid
    if (typeof schema.minParticipants !== 'number' || schema.minParticipants < 1) {
        schema.minParticipants = 1;
    }
    if (schema.minParticipants > schema.maxParticipants) {
        schema.minParticipants = schema.maxParticipants;
    }

    return schema;
}
