// ─── Reminder System Types ──────────────────────────────────────────────────

/** Round information extracted from event context */
export interface RoundInfo {
    roundName: string;
    roundDate: string;       // ISO date string (YYYY-MM-DD)
    roundTime?: string;      // HH:mm format, optional
    mode?: string;           // Online / Offline / Hybrid
    venue?: string;
}

/** Input for the reminder system */
export interface ReminderInput {
    eventName: string;
    timezone?: string;       // IANA timezone, default: Asia/Kolkata
    rounds: RoundInfo[];     // at least 1, max 20
}

/** AI-generated reminder draft per round */
export interface ReminderDraft {
    roundName: string;
    roundDate: string;
    subject: string;
    body: string;
}

/** Preview response (AI-only, before Drive/Calendar creation) */
export interface ReminderPreviewResponse {
    success: boolean;
    data: {
        eventName: string;
        reminders: ReminderDraft[];
    };
}

/** Per-round result after Drive + Calendar creation */
export interface RoundResult {
    roundName: string;
    driveFile?: {
        fileId: string;
        fileUrl: string;
        fileName: string;
    };
    calendarRoundEvent?: {
        eventId: string;
        eventUrl: string;
    };
    calendarReminderEvent?: {
        eventId: string;
        eventUrl: string;
    };
    skipped: boolean;
    skipReason?: string;
    errors: string[];
}

/** Final response after Drive + Calendar creation */
export interface ReminderCreateResponse {
    success: boolean;
    overallSuccess: boolean;
    data: {
        eventName: string;
        rounds: RoundResult[];
        driveFolderUrl?: string;
        summary: {
            total: number;
            succeeded: number;
            skipped: number;
            failed: number;
        };
    };
}

/** Create endpoint input (confirmed drafts from preview) */
export interface ReminderCreateInput {
    eventName: string;
    timezone?: string;
    reminders: ReminderDraft[];
}
