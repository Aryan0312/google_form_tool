import { config } from '../config';
import { FormSchema } from '../types/form.types';
import { STAGE1_SYSTEM_PROMPT, buildStage1UserPrompt } from '../prompts/stage1.prompt';

// ─── Groq API Config ────────────────────────────────────────────────────────

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

// ─── Stage 1: Parse Event Text → FormSchema ────────────────────────────────

export async function parseEventText(
    rawText: string,
    customFields: string = '',
    requiredFields: string = ''
): Promise<FormSchema> {
    if (!rawText || rawText.trim().length === 0) {
        throw Object.assign(new Error('Event text cannot be empty.'), { statusCode: 400 });
    }

    console.log(`📝 Parsing event text (${rawText.length} chars) with model: ${MODEL}`);
    if (customFields) console.log(`   📦 Custom fields: ${customFields}`);
    if (requiredFields) console.log(`   ⚡ Required fields: ${requiredFields}`);

    // Direct HTTP call to Groq API (avoids SDK issues)
    const requestBody = {
        model: MODEL,
        messages: [
            { role: 'system', content: STAGE1_SYSTEM_PROMPT },
            { role: 'user', content: buildStage1UserPrompt(rawText, customFields, requiredFields) },
        ],
        temperature: 0.1,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
    };

    let responseData: any;

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

            // Retry without response_format if it fails
            console.log('🔄 Retrying without response_format...');
            const retryBody = { ...requestBody };
            delete (retryBody as any).response_format;
            retryBody.messages = [
                { role: 'system', content: STAGE1_SYSTEM_PROMPT + '\n\nCRITICAL: Return ONLY raw JSON. No markdown code fences, no explanation, no extra text.' },
                { role: 'user', content: buildStage1UserPrompt(rawText, customFields, requiredFields) },
            ];

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

            responseData = await retryResponse.json();
        } else {
            responseData = await response.json();
        }
    } catch (err: any) {
        console.error('❌ Groq API call failed:', err.message);
        throw Object.assign(
            new Error(`AI service error: ${err.message}`),
            { statusCode: 502 }
        );
    }

    const content = responseData?.choices?.[0]?.message?.content;
    if (!content) {
        throw Object.assign(new Error('AI returned an empty response.'), { statusCode: 502 });
    }

    console.log('✅ AI response received, parsing JSON...');

    // Strip DeepSeek R1 reasoning tags <think>...</think>
    let jsonStr = content.trim();
    jsonStr = jsonStr.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    // Extract JSON from response (handle markdown code fences if present)
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
    }

    // Parse and validate
    let schema: FormSchema;
    try {
        schema = JSON.parse(jsonStr) as FormSchema;
    } catch {
        console.error('❌ Invalid JSON from AI:', jsonStr.substring(0, 300));
        throw Object.assign(
            new Error('AI returned invalid JSON. Please try again.'),
            { statusCode: 502 }
        );
    }

    // Structural validation
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

    console.log(`✅ Schema parsed: "${schema.title}" (${schema.eventType}, ${schema.minParticipants}-${schema.maxParticipants} participants, ${schema.fields.length} fields)`);

    return schema;
}
