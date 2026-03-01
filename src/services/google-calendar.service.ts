import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/*
 * Scope: calendar.events
 * NOTE: This is the narrowest scope that allows event creation.
 * FormForge only creates/reads its OWN events, identified by
 * extendedProperties.private.formforgeId. We never read or
 * modify the user's personal calendar events.
 */

// ─── Deduplication Key ──────────────────────────────────────────────────────

function makeFormforgeId(eventName: string, roundName: string, type: 'round' | 'reminder'): string {
    const slug = `${eventName}::${roundName}::${type}`
        .toLowerCase()
        .replace(/[^a-z0-9:]/g, '-')
        .substring(0, 200);
    return slug;
}

// ─── Parse Date + Time into RFC 3339 ────────────────────────────────────────

function buildDateTime(dateStr: string, timeStr?: string): { dateTime: string } | { date: string } {
    // If we have a time, return dateTime
    if (timeStr && /^\d{2}:\d{2}$/.test(timeStr)) {
        return { dateTime: `${dateStr}T${timeStr}:00` };
    }
    // Otherwise return all-day event
    return { date: dateStr };
}

function buildEndDateTime(dateStr: string, timeStr?: string): { dateTime: string } | { date: string } {
    if (timeStr && /^\d{2}:\d{2}$/.test(timeStr)) {
        // Add 2 hours for round duration
        const [h, m] = timeStr.split(':').map(Number);
        const endH = Math.min(h + 2, 23);
        const endTime = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        return { dateTime: `${dateStr}T${endTime}:00` };
    }
    // All-day event: same end date
    return { date: dateStr };
}

// ─── Check if Date is in the Past ───────────────────────────────────────────

function isDateInPast(dateStr: string): boolean {
    const eventDate = new Date(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return eventDate < now;
}

// ─── Find Existing Event by FormForge ID ────────────────────────────────────

async function findExistingEvent(
    calendar: any,
    formforgeId: string
): Promise<{ eventId: string; eventUrl: string } | null> {
    try {
        const result = await calendar.events.list({
            calendarId: 'primary',
            privateExtendedProperty: `formforgeId=${formforgeId}`,
            maxResults: 1,
        });

        if (result.data.items && result.data.items.length > 0) {
            const event = result.data.items[0];
            return {
                eventId: event.id!,
                eventUrl: event.htmlLink || `https://calendar.google.com/calendar/event?eid=${event.id}`,
            };
        }
    } catch (err) {
        // Search failed — proceed to create
        console.warn('   ⚠️ Calendar search failed, will create new event');
    }
    return null;
}

// ─── Create Round Events for a Single Round ─────────────────────────────────

export async function createRoundCalendarEvents(
    auth: OAuth2Client,
    eventName: string,
    roundName: string,
    roundDate: string,
    roundTime: string | undefined,
    timezone: string = DEFAULT_TIMEZONE,
    driveFolderUrl?: string
): Promise<{
    roundEvent?: { eventId: string; eventUrl: string };
    reminderEvent?: { eventId: string; eventUrl: string };
    skipped: boolean;
    skipReason?: string;
}> {
    // Skip past dates
    if (isDateInPast(roundDate)) {
        console.log(`   ⏭️  Calendar: ${roundName} — skipped (date in past)`);
        return { skipped: true, skipReason: 'Round date is in the past' };
    }

    // Validate date format
    const dateCheck = new Date(roundDate);
    if (isNaN(dateCheck.getTime())) {
        console.log(`   ⏭️  Calendar: ${roundName} — skipped (invalid date: ${roundDate})`);
        return { skipped: true, skipReason: `Invalid date: ${roundDate}` };
    }

    const calendar = google.calendar({ version: 'v3', auth });

    // ── Event A: Actual Round ──
    const roundFormforgeId = makeFormforgeId(eventName, roundName, 'round');
    let roundEvent: { eventId: string; eventUrl: string } | undefined;

    const existingRound = await findExistingEvent(calendar, roundFormforgeId);
    if (existingRound) {
        console.log(`   📆 Calendar: ${roundName} — round event already exists (${existingRound.eventId})`);
        roundEvent = existingRound;
    } else {
        const startDt = buildDateTime(roundDate, roundTime);
        const endDt = buildEndDateTime(roundDate, roundTime);

        const roundResult = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: {
                summary: `${eventName} - ${roundName}`,
                start: { ...startDt, timeZone: timezone },
                end: { ...endDt, timeZone: timezone },
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'popup', minutes: 60 },
                    ],
                },
                extendedProperties: {
                    private: { formforgeId: roundFormforgeId },
                },
            },
        });

        roundEvent = {
            eventId: roundResult.data.id!,
            eventUrl: roundResult.data.htmlLink || '',
        };
        console.log(`   📆 Calendar: ${roundName} — round event created (${roundEvent.eventId})`);
    }

    // ── Event B: Send Reminder (1 day before) ──
    const reminderFormforgeId = makeFormforgeId(eventName, roundName, 'reminder');
    let reminderEvent: { eventId: string; eventUrl: string } | undefined;

    const existingReminder = await findExistingEvent(calendar, reminderFormforgeId);
    if (existingReminder) {
        console.log(`   📆 Calendar: ${roundName} — reminder event already exists (${existingReminder.eventId})`);
        reminderEvent = existingReminder;
    } else {
        // Calculate 1 day before
        const reminderDate = new Date(roundDate);
        reminderDate.setDate(reminderDate.getDate() - 1);
        const reminderDateStr = reminderDate.toISOString().split('T')[0];

        // Skip if reminder date is also in the past
        if (isDateInPast(reminderDateStr)) {
            console.log(`   ⏭️  Calendar: ${roundName} — reminder event skipped (1-day-before is past)`);
        } else {
            const description = driveFolderUrl
                ? `Send the reminder email for ${roundName}.\n\nDraft saved in Google Drive:\n${driveFolderUrl}`
                : `Send the reminder email for ${roundName}.\n\nCheck your Google Drive FormForge folder for the draft.`;

            const reminderResult = await calendar.events.insert({
                calendarId: 'primary',
                requestBody: {
                    summary: `Send reminder email - ${eventName} ${roundName}`,
                    description,
                    start: { date: reminderDateStr, timeZone: timezone },
                    end: { date: reminderDateStr, timeZone: timezone },
                    reminders: {
                        useDefault: false,
                        overrides: [
                            { method: 'popup', minutes: 0 },
                        ],
                    },
                    extendedProperties: {
                        private: { formforgeId: reminderFormforgeId },
                    },
                },
            });

            reminderEvent = {
                eventId: reminderResult.data.id!,
                eventUrl: reminderResult.data.htmlLink || '',
            };
            console.log(`   📆 Calendar: ${roundName} — reminder event created (${reminderEvent.eventId})`);
        }
    }

    return { roundEvent, reminderEvent, skipped: false };
}
