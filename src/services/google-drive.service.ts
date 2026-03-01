import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// ─── Constants ──────────────────────────────────────────────────────────────

const ROOT_FOLDER_NAME = 'FormForge';
const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder';

// ─── Sanitize folder/file names for Drive ───────────────────────────────────

export function sanitizeDriveName(name: string): string {
    return name.replace(/[\/\\:*?"<>|]/g, '-').trim().substring(0, 200);
}

// ─── Find or Create a Folder (idempotent) ───────────────────────────────────

export async function findOrCreateFolder(
    auth: OAuth2Client,
    folderName: string,
    parentId?: string
): Promise<{ folderId: string; isNew: boolean }> {
    const drive = google.drive({ version: 'v3', auth });
    const safeName = sanitizeDriveName(folderName);

    // Search for existing folder
    let query = `name='${safeName}' and mimeType='${DRIVE_FOLDER_MIME}' and trashed=false`;
    if (parentId) {
        query += ` and '${parentId}' in parents`;
    }

    const searchResult = await drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive',
    });

    if (searchResult.data.files && searchResult.data.files.length > 0) {
        const existing = searchResult.data.files[0];
        console.log(`   📂 Drive: ${safeName}/ — found existing (${existing.id})`);
        return { folderId: existing.id!, isNew: false };
    }

    // Create new folder
    const createResult = await drive.files.create({
        requestBody: {
            name: safeName,
            mimeType: DRIVE_FOLDER_MIME,
            parents: parentId ? [parentId] : undefined,
        },
        fields: 'id',
    });

    console.log(`   📂 Drive: ${safeName}/ — created (${createResult.data.id})`);
    return { folderId: createResult.data.id!, isNew: true };
}

// ─── Find or Create a Reminder File (idempotent) ────────────────────────────

export async function findOrCreateReminderFile(
    auth: OAuth2Client,
    folderId: string,
    fileName: string,
    content: string
): Promise<{ fileId: string; fileUrl: string; isNew: boolean }> {
    const drive = google.drive({ version: 'v3', auth });
    const safeName = sanitizeDriveName(fileName);

    // Check if file already exists in the folder
    const searchResult = await drive.files.list({
        q: `name='${safeName}' and '${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, webViewLink)',
        spaces: 'drive',
    });

    if (searchResult.data.files && searchResult.data.files.length > 0) {
        const existing = searchResult.data.files[0];
        // Update content of existing file
        await drive.files.update({
            fileId: existing.id!,
            media: {
                mimeType: 'text/plain',
                body: content,
            },
        });
        console.log(`   📄 Drive: ${safeName} — updated existing (${existing.id})`);
        return {
            fileId: existing.id!,
            fileUrl: existing.webViewLink || `https://drive.google.com/file/d/${existing.id}/view`,
            isNew: false,
        };
    }

    // Create new file
    const createResult = await drive.files.create({
        requestBody: {
            name: safeName,
            parents: [folderId],
        },
        media: {
            mimeType: 'text/plain',
            body: content,
        },
        fields: 'id, webViewLink',
    });

    console.log(`   📄 Drive: ${safeName} — created (${createResult.data.id})`);
    return {
        fileId: createResult.data.id!,
        fileUrl: createResult.data.webViewLink || `https://drive.google.com/file/d/${createResult.data.id}/view`,
        isNew: true,
    };
}

// ─── Create Full Folder Structure + Files ───────────────────────────────────

export async function saveRemindersToDrive(
    auth: OAuth2Client,
    eventName: string,
    reminders: { roundName: string; roundDate: string; subject: string; body: string }[]
): Promise<{
    folderId: string;
    folderUrl: string;
    files: { roundName: string; fileId: string; fileUrl: string; fileName: string }[];
}> {
    // Step 1: Find/create root FormForge folder
    const root = await findOrCreateFolder(auth, ROOT_FOLDER_NAME);

    // Step 2: Find/create event subfolder
    const eventFolder = await findOrCreateFolder(auth, eventName, root.folderId);
    const folderUrl = `https://drive.google.com/drive/folders/${eventFolder.folderId}`;

    // Step 3: Create reminder files for each round
    const files: { roundName: string; fileId: string; fileUrl: string; fileName: string }[] = [];

    for (const reminder of reminders) {
        const dateStr = reminder.roundDate.split('T')[0]; // YYYY-MM-DD
        const safeRoundName = sanitizeDriveName(reminder.roundName);
        const fileName = `${safeRoundName}-Reminder-${dateStr}.txt`;

        const fileContent = `Subject: ${reminder.subject}\n\n${reminder.body}`;

        const result = await findOrCreateReminderFile(auth, eventFolder.folderId, fileName, fileContent);
        files.push({
            roundName: reminder.roundName,
            fileId: result.fileId,
            fileUrl: result.fileUrl,
            fileName,
        });
    }

    return { folderId: eventFolder.folderId, folderUrl, files };
}
