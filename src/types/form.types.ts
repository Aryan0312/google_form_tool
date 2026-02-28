// ─── Shared TypeScript Interfaces ───────────────────────────────────────────

export type FieldType = 'SHORT_ANSWER' | 'CHECKBOX' | 'FILE_UPLOAD' | 'SECTION_HEADER';
export type EventType = 'SOLO' | 'TEAM';

export interface FormField {
    label: string;
    type: FieldType;
    required: boolean;
    description?: string;
}

export interface FormSchema {
    title: string;
    description: string;
    eventType: EventType;
    minParticipants: number;
    maxParticipants: number;
    fields: FormField[];
}

export interface GenerateRequest {
    text: string;
}

export interface GenerateResponse {
    success: boolean;
    data: FormSchema;
}

export interface CreateFormResponse {
    success: boolean;
    data: {
        formId: string;
        editUrl: string;
        responderUrl: string;
    };
}

export interface AppError extends Error {
    statusCode?: number;
}
