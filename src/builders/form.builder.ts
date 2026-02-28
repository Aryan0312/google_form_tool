import { FormSchema, FormField } from '../types/form.types';

// ─── Google Forms API Request Types ─────────────────────────────────────────

interface CreateItemRequest {
    createItem: {
        item: any;
        location: { index: number };
    };
}

interface BatchUpdateRequest {
    requests: CreateItemRequest[];
}

// ─── Build batchUpdate Requests from FormSchema ─────────────────────────────

export function buildBatchUpdateRequests(schema: FormSchema): BatchUpdateRequest {
    const requests: CreateItemRequest[] = [];
    let index = 0;

    for (const field of schema.fields) {
        const request = buildItemRequest(field, index);
        if (request) {
            requests.push(request);
            index++;
        }
    }

    return { requests };
}

// ─── Build Individual Item Request ──────────────────────────────────────────

function buildItemRequest(field: FormField, index: number): CreateItemRequest | null {
    switch (field.type) {
        case 'SECTION_HEADER':
            return {
                createItem: {
                    item: {
                        title: field.label,
                        description: field.description || '',
                        pageBreakItem: {},
                    },
                    location: { index },
                },
            };

        case 'SHORT_ANSWER':
            return {
                createItem: {
                    item: {
                        title: field.label,
                        description: field.description || '',
                        questionItem: {
                            question: {
                                required: field.required,
                                textQuestion: {
                                    paragraph: false,
                                },
                            },
                        },
                    },
                    location: { index },
                },
            };

        case 'CHECKBOX':
            return {
                createItem: {
                    item: {
                        title: field.label,
                        description: field.description || '',
                        questionItem: {
                            question: {
                                required: field.required,
                                choiceQuestion: {
                                    type: 'CHECKBOX',
                                    options: [{ value: 'Yes' }],
                                },
                            },
                        },
                    },
                    location: { index },
                },
            };

        case 'FILE_UPLOAD':
            // Google Forms API does NOT support creating FILE_UPLOAD questions via API.
            // Use a paragraph text field asking for a shareable link instead.
            return {
                createItem: {
                    item: {
                        title: field.label,
                        description: (field.description || '') + '\nPlease paste a shareable Google Drive or Imgur link to your screenshot.',
                        questionItem: {
                            question: {
                                required: field.required,
                                textQuestion: {
                                    paragraph: true,
                                },
                            },
                        },
                    },
                    location: { index },
                },
            };

        default:
            console.warn(`Unknown field type: ${field.type}, skipping.`);
            return null;
    }
}
