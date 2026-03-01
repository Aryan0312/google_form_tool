import { google } from 'googleapis';
import { getAuthenticatedClient } from './google-auth.service';
import { buildBatchUpdateRequests } from '../builders/form.builder';
import { FormSchema, CreateFormResponse } from '../types/form.types';
import { Request } from 'express';

// ─── Create Google Form from Schema ─────────────────────────────────────────

export async function createGoogleForm(req: Request, schema: FormSchema): Promise<CreateFormResponse['data']> {
    const auth = getAuthenticatedClient(req);
    const forms = google.forms({ version: 'v1', auth });

    //  Step 1: Create the form (title only — Google API limitation)
    const createResponse = await forms.forms.create({
        requestBody: {
            info: {
                title: schema.title,
            },
        },
    });

    const formId = createResponse.data.formId;
    if (!formId) {
        throw Object.assign(new Error('Failed to create Google Form — no formId returned.'), {
            statusCode: 502,
        });
    }

    //  Step 2: Update the form description
    await forms.forms.batchUpdate({
        formId,
        requestBody: {
            requests: [
                {
                    updateFormInfo: {
                        info: {
                            description: schema.description,
                        },
                        updateMask: 'description',
                    },
                },
            ],
        },
    });

    //  Step 3: Add all form items via batchUpdate
    const batchRequest = buildBatchUpdateRequests(schema);

    if (batchRequest.requests.length > 0) {
        await forms.forms.batchUpdate({
            formId,
            requestBody: batchRequest,
        });
    }

    //  Step 4: Retrieve the form to get URLs
    const formDetails = await forms.forms.get({ formId });

    const editUrl = `https://docs.google.com/forms/d/${formId}/edit`;
    const responderUrl = formDetails.data.responderUri || `https://docs.google.com/forms/d/e/${formId}/viewform`;

    console.log(`✅ Google Form created: ${editUrl}`);

    return {
        formId,
        editUrl,
        responderUrl,
    };
}
