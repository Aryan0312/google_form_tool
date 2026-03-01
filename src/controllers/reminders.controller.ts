import { Request, Response, NextFunction } from 'express';
import { generateReminderEmails } from '../services/reminder-ai.service';
import { saveRemindersToDrive } from '../services/google-drive.service';
import { createRoundCalendarEvents } from '../services/google-calendar.service';
import { getAuthenticatedClient } from '../services/google-auth.service';
import {
    RoundInfo,
    ReminderDraft,
    RoundResult,
    ReminderCreateInput,
} from '../types/reminder.types';

// ─── Validation Limits ──────────────────────────────────────────────────────

const MAX_EVENT_NAME = 200;
const MAX_ROUND_NAME = 100;
const MAX_ROUNDS = 20;
const MAX_SUBJECT = 300;
const MAX_BODY = 3000;
const DEFAULT_TIMEZONE = 'Asia/Kolkata';

// ─── Validate Date Format ───────────────────────────────────────────────────

function isValidDate(dateStr: string): boolean {
    const d = new Date(dateStr);
    return !isNaN(d.getTime());
}

// ─── POST /api/reminders/preview — AI-only, no Google APIs ─────────────────

export async function previewReminders(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { eventName, rounds } = req.body;

        // ── Validate eventName ──
        if (!eventName || typeof eventName !== 'string' || eventName.trim().length === 0) {
            res.status(400).json({ success: false, error: 'Missing or empty "eventName".' });
            return;
        }
        if (eventName.length > MAX_EVENT_NAME) {
            res.status(400).json({ success: false, error: `Event name too long (max ${MAX_EVENT_NAME} chars).` });
            return;
        }

        // ── Validate rounds ──
        if (!rounds || !Array.isArray(rounds) || rounds.length === 0) {
            res.status(400).json({ success: false, error: 'At least one round is required.' });
            return;
        }
        if (rounds.length > MAX_ROUNDS) {
            res.status(400).json({ success: false, error: `Too many rounds (max ${MAX_ROUNDS}).` });
            return;
        }

        // Validate each round
        for (let i = 0; i < rounds.length; i++) {
            const round = rounds[i] as RoundInfo;
            if (!round.roundName || typeof round.roundName !== 'string') {
                res.status(400).json({ success: false, error: `Round ${i + 1}: missing "roundName".` });
                return;
            }
            if (round.roundName.length > MAX_ROUND_NAME) {
                res.status(400).json({ success: false, error: `Round ${i + 1}: name too long (max ${MAX_ROUND_NAME}).` });
                return;
            }
            if (!round.roundDate || !isValidDate(round.roundDate)) {
                res.status(400).json({ success: false, error: `Round ${i + 1} ("${round.roundName}"): missing or invalid date.` });
                return;
            }
        }

        // ── Generate reminder emails via AI ──
        const reminders = await generateReminderEmails(eventName.trim(), rounds);

        res.json({
            success: true,
            data: {
                eventName: eventName.trim(),
                reminders,
            },
        });
    } catch (err) {
        next(err);
    }
}

// ─── POST /api/reminders/create — Drive + Calendar ─────────────────────────

export async function createReminders(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { eventName, timezone, reminders } = req.body as ReminderCreateInput;

        // ── Validate ──
        if (!eventName || typeof eventName !== 'string' || eventName.trim().length === 0) {
            res.status(400).json({ success: false, error: 'Missing or empty "eventName".' });
            return;
        }
        if (!reminders || !Array.isArray(reminders) || reminders.length === 0) {
            res.status(400).json({ success: false, error: 'No reminder drafts provided.' });
            return;
        }
        if (reminders.length > MAX_ROUNDS) {
            res.status(400).json({ success: false, error: `Too many reminders (max ${MAX_ROUNDS}).` });
            return;
        }

        // Validate each draft
        for (let i = 0; i < reminders.length; i++) {
            const r = reminders[i];
            if (!r.roundName || !r.roundDate || !r.subject || !r.body) {
                res.status(400).json({ success: false, error: `Reminder ${i + 1}: missing required fields.` });
                return;
            }
            if (r.subject.length > MAX_SUBJECT) {
                res.status(400).json({ success: false, error: `Reminder ${i + 1}: subject too long (max ${MAX_SUBJECT}).` });
                return;
            }
            if (r.body.length > MAX_BODY) {
                res.status(400).json({ success: false, error: `Reminder ${i + 1}: body too long (max ${MAX_BODY}).` });
                return;
            }
        }

        const tz = timezone || DEFAULT_TIMEZONE;
        const auth = getAuthenticatedClient(req);

        console.log(`📅 Creating reminders for "${eventName}" (${reminders.length} round${reminders.length > 1 ? 's' : ''})`);

        // ── Step 1: Save to Drive ──
        let driveResult: Awaited<ReturnType<typeof saveRemindersToDrive>> | null = null;
        try {
            driveResult = await saveRemindersToDrive(auth, eventName.trim(), reminders);
        } catch (err: any) {
            console.error('❌ Drive operation failed:', err.message);
            // Drive failure is non-fatal — continue to Calendar
        }

        // ── Step 2: Create Calendar events, per-round ──
        const roundResults: RoundResult[] = [];
        let succeeded = 0;
        let skipped = 0;
        let failed = 0;

        for (const reminder of reminders) {
            const result: RoundResult = {
                roundName: reminder.roundName,
                skipped: false,
                errors: [],
            };

            // Attach Drive file info if available
            if (driveResult) {
                const driveFile = driveResult.files.find(f => f.roundName === reminder.roundName);
                if (driveFile) {
                    result.driveFile = {
                        fileId: driveFile.fileId,
                        fileUrl: driveFile.fileUrl,
                        fileName: driveFile.fileName,
                    };
                }
            }

            // Create Calendar events
            try {
                const calResult = await createRoundCalendarEvents(
                    auth,
                    eventName.trim(),
                    reminder.roundName,
                    reminder.roundDate,
                    undefined, // time parsed from date if available
                    tz,
                    driveResult?.folderUrl
                );

                if (calResult.skipped) {
                    result.skipped = true;
                    result.skipReason = calResult.skipReason;
                    skipped++;
                } else {
                    result.calendarRoundEvent = calResult.roundEvent;
                    result.calendarReminderEvent = calResult.reminderEvent;
                    succeeded++;
                }
            } catch (err: any) {
                console.error(`   ❌ Calendar failed for "${reminder.roundName}":`, err.message);
                result.errors.push(`Calendar: ${err.message}`);
                failed++;
            }

            roundResults.push(result);
        }

        // ── Determine HTTP status ──
        const overallSuccess = failed === 0;
        const httpStatus = failed === 0 ? 200 : (succeeded > 0 || skipped > 0 ? 207 : 502);

        console.log(`✅ Reminders: ${succeeded} succeeded, ${skipped} skipped, ${failed} failed`);

        res.status(httpStatus).json({
            success: httpStatus < 400,
            overallSuccess,
            data: {
                eventName: eventName.trim(),
                rounds: roundResults,
                driveFolderUrl: driveResult?.folderUrl,
                summary: {
                    total: reminders.length,
                    succeeded,
                    skipped,
                    failed,
                },
            },
        });
    } catch (err) {
        next(err);
    }
}
