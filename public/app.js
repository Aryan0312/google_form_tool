// ═══════════════════════════════════════════════════════════════════════════
//  FormForge AI — Frontend Logic
// ═══════════════════════════════════════════════════════════════════════════

let currentSchema = null;
let customFieldChips = []; // { name: string, required: boolean }

// ─── Init ─────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();

    const params = new URLSearchParams(window.location.search);
    if (params.has('auth')) {
        const status = params.get('auth');
        if (status === 'success') {
            showToast('Google account connected successfully!', 'success');
            checkAuthStatus();
        } else {
            showToast('Failed to connect Google account.', 'error');
        }
        window.history.replaceState({}, '', '/');
    }
});

// ─── Page Navigation ──────────────────────────────────────────────────────

function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById(`page-${page}`).classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Auth ─────────────────────────────────────────────────────────────────

async function checkAuthStatus() {
    try {
        const res = await fetch('/api/auth/status');
        const data = await res.json();
        const badge = document.getElementById('auth-status');
        const btn = document.getElementById('auth-btn');

        if (data.authenticated) {
            badge.className = 'auth-badge connected';
            badge.querySelector('.auth-text').textContent = 'Google Connected';
            btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        Disconnect
      `;
            btn.disabled = false;
            btn.style.opacity = '';
            btn.className = 'btn btn-outline btn-sm btn-disconnect';
            btn.onclick = disconnectGoogle;
        } else {
            badge.className = 'auth-badge disconnected';
            badge.querySelector('.auth-text').textContent = 'Google Disconnected';
            btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" y1="12" x2="3" y2="12" />
        </svg>
        Connect Google
      `;
            btn.disabled = false;
            btn.style.opacity = '';
            btn.className = 'btn btn-outline btn-sm';
            btn.onclick = connectGoogle;
        }
    } catch (e) {
        console.error('Auth status check failed:', e);
    }
}

async function connectGoogle() {
    try {
        const res = await fetch('/api/auth/url');
        const data = await res.json();
        if (data.url) {
            window.location.href = data.url;
        } else {
            showToast('Failed to get auth URL. Check Google credentials in .env', 'error');
        }
    } catch (e) {
        showToast('Failed to connect to server.', 'error');
    }
}

async function disconnectGoogle() {
    try {
        const res = await fetch('/api/auth/disconnect');
        const data = await res.json();
        if (data.success) {
            showToast('Google account disconnected.', 'success');
            checkAuthStatus();
        } else {
            showToast('Failed to disconnect.', 'error');
        }
    } catch (e) {
        showToast('Failed to disconnect from server.', 'error');
    }
}

// ─── Custom Field Chips ───────────────────────────────────────────────────

function addField() {
    const input = document.getElementById('field-input');
    const val = input.value.trim();
    if (!val) return;

    // Prevent duplicates (case-insensitive)
    if (customFieldChips.some(c => c.name.toLowerCase() === val.toLowerCase())) {
        showToast('Field already added.', 'error');
        return;
    }

    customFieldChips.push({ name: val, required: false });
    input.value = '';
    input.focus();
    renderChips();
}

function removeField(index) {
    customFieldChips.splice(index, 1);
    renderChips();
}

function toggleRequired(index) {
    customFieldChips[index].required = !customFieldChips[index].required;
    renderChips();
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function renderChips() {
    const container = document.getElementById('chips-container');
    if (customFieldChips.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = customFieldChips.map((chip, i) => `
    <div class="chip ${chip.required ? 'chip-required' : ''}">
      <button class="chip-star" onclick="toggleRequired(${i})" title="${chip.required ? 'Click to make optional' : 'Click to make required'}">
        ${chip.required ? '★' : '☆'}
      </button>
      <span class="chip-name">${escapeHtml(chip.name)}</span>
      <span class="chip-tag">${chip.required ? 'Required' : 'Optional'}</span>
      <button class="chip-remove" onclick="removeField(${i})" title="Remove field">×</button>
    </div>
  `).join('');
}

// ─── Stage 1: Parse Event ─────────────────────────────────────────────────

async function parseEvent() {
    const text = document.getElementById('event-text').value.trim();
    if (!text) {
        showToast('Please paste event information first.', 'error');
        return;
    }

    const btn = document.getElementById('parse-btn');
    btn.classList.add('loading');
    btn.disabled = true;

    // Build custom & required fields from chips
    const allCustom = customFieldChips.map(c => c.name);
    const requiredOnly = customFieldChips.filter(c => c.required).map(c => c.name);

    const customFields = allCustom.length > 0 ? allCustom.join('\n') : '';
    const requiredFields = requiredOnly.length > 0 ? requiredOnly.join(', ') : '';

    try {
        const res = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, customFields, requiredFields }),
        });

        const data = await res.json();

        if (!data.success) {
            throw new Error(data.error || 'Parsing failed.');
        }

        currentSchema = data.data;
        renderPreview(currentSchema);
        showToast('Event parsed successfully!', 'success');
    } catch (e) {
        showToast(e.message || 'An error occurred during parsing.', 'error');
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

// ─── Render Preview ───────────────────────────────────────────────────────

function renderPreview(schema) {
    document.getElementById('step2').classList.remove('hidden');
    document.getElementById('step2').scrollIntoView({ behavior: 'smooth', block: 'start' });

    const badges = document.getElementById('event-badges');
    badges.innerHTML = `
    <span class="event-badge ${schema.eventType === 'SOLO' ? 'event-badge-solo' : 'event-badge-team'}">
      ${schema.eventType}
    </span>
    <span class="event-badge event-badge-count">
      ${schema.minParticipants === schema.maxParticipants
            ? `${schema.maxParticipants} ${schema.maxParticipants === 1 ? 'participant' : 'participants'}`
            : `${schema.minParticipants}-${schema.maxParticipants} participants`}
    </span>
  `;

    const summaryGrid = document.getElementById('summary-grid');
    const summaryItems = extractSummaryFromDescription(schema.description);
    summaryGrid.innerHTML = summaryItems.map(item => `
    <div class="summary-item">
      <div class="summary-label">${item.label}</div>
      <div class="summary-value">${item.value}</div>
    </div>
  `).join('');

    const fieldsList = document.getElementById('fields-list');
    fieldsList.innerHTML = schema.fields.map(field => {
        const isSection = field.type === 'SECTION_HEADER';
        const iconClass = getFieldIconClass(field.type);
        const iconLabel = getFieldIconLabel(field.type);

        return `
      <div class="field-item ${isSection ? 'field-item-section' : ''}">
        <div class="field-info">
          <div class="field-icon ${iconClass}">${iconLabel}</div>
          <span class="field-name">${field.label}</span>
        </div>
        <div class="field-tags">
          ${!isSection ? `
            <span class="field-tag field-tag-type">${field.type.replace('_', ' ')}</span>
            <span class="field-tag ${field.required ? 'field-tag-required' : 'field-tag-optional'}">
              ${field.required ? 'Required' : 'Optional'}
            </span>
          ` : '<span class="field-tag field-tag-type">Section</span>'}
        </div>
      </div>
    `;
    }).join('');

    document.getElementById('json-preview').textContent = JSON.stringify(schema, null, 2);
}

function extractSummaryFromDescription(desc) {
    const items = [];
    const patterns = [
        { regex: /Mode[:\s]*(.+)/i, label: 'Mode' },
        { regex: /Date[:\s]*(.+)/i, label: 'Date' },
        { regex: /Deadline[:\s]*(.+)/i, label: 'Deadline' },
        { regex: /Prize Pool[:\s]*(.+)/i, label: 'Prize' },
        { regex: /Team Size[:\s]*(.+)/i, label: 'Team Size' },
        { regex: /Fee[:\s]*(.+)/i, label: 'Fee' },
    ];

    for (const p of patterns) {
        const match = desc.match(p.regex);
        if (match) {
            // Clean up emoji prefixes like 🔹
            const val = match[1].trim().replace(/^[🔹📍📅⏰🏆👥💰]\s*/g, '');
            if (val && val.length > 0) {
                items.push({ label: p.label, value: val });
            }
        }
    }

    if (items.length === 0) {
        items.push({ label: 'Description', value: desc.substring(0, 120) + '...' });
    }

    return items;
}

function getFieldIconClass(type) {
    switch (type) {
        case 'SHORT_ANSWER': return 'field-icon-text';
        case 'CHECKBOX': return 'field-icon-checkbox';
        case 'FILE_UPLOAD': return 'field-icon-file';
        case 'SECTION_HEADER': return 'field-icon-section';
        default: return 'field-icon-text';
    }
}

function getFieldIconLabel(type) {
    switch (type) {
        case 'SHORT_ANSWER': return 'Aa';
        case 'CHECKBOX': return '☑';
        case 'FILE_UPLOAD': return '📎';
        case 'SECTION_HEADER': return '§';
        default: return '?';
    }
}

// ─── Stage 2: Create Form ─────────────────────────────────────────────────

async function createForm() {
    if (!currentSchema) {
        showToast('No form schema available. Parse an event first.', 'error');
        return;
    }

    const btn = document.getElementById('create-btn');
    btn.classList.add('loading');
    btn.disabled = true;

    try {
        const res = await fetch('/api/forms/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentSchema),
        });

        const data = await res.json();

        if (!data.success) {
            throw new Error(data.error || 'Form creation failed.');
        }

        renderResult(data.data);
        showToast('Google Form created!', 'success');
    } catch (e) {
        showToast(e.message || 'Failed to create Google Form.', 'error');
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

// ─── Render Result ────────────────────────────────────────────────────────

function renderResult(data) {
    document.getElementById('step3').classList.remove('hidden');
    document.getElementById('step3').scrollIntoView({ behavior: 'smooth', block: 'start' });

    document.getElementById('result-form-id').textContent = `Form ID: ${data.formId}`;
    document.getElementById('edit-url').href = data.editUrl;
    document.getElementById('responder-url').href = data.responderUrl;
}

// ─── Restart ──────────────────────────────────────────────────────────────

function restart() {
    currentSchema = null;
    customFieldChips = [];
    document.getElementById('event-text').value = '';
    document.getElementById('field-input').value = '';
    renderChips();
    document.getElementById('step2').classList.add('hidden');
    document.getElementById('step3').classList.add('hidden');
    document.getElementById('step1').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Toast ────────────────────────────────────────────────────────────────

function showToast(message, type = '') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast visible ${type}`;

    setTimeout(() => {
        toast.classList.remove('visible');
    }, 3500);
}

// ─── Reminder System ──────────────────────────────────────────────────────

let currentReminderDrafts = null;

async function previewReminders() {
    if (!currentSchema) {
        showToast('No form schema available. Parse an event first.', 'error');
        return;
    }

    // Build rounds from schema
    const rounds = [];
    if (currentSchema.rounds && currentSchema.rounds.length > 0) {
        for (const r of currentSchema.rounds) {
            if (r.date) {
                rounds.push({
                    roundName: r.name,
                    roundDate: r.date,
                    roundTime: r.time || undefined,
                });
            }
        }
    }

    if (rounds.length === 0) {
        const hasRoundsWithoutDates = currentSchema.rounds && currentSchema.rounds.length > 0;
        if (hasRoundsWithoutDates) {
            showToast('Rounds found but none have dates. AI could not extract dates from the event text.', 'error');
        } else {
            showToast('No rounds or dates detected in this event. Reminders require at least one round with a date.', 'error');
        }
        return;
    }

    const btn = document.getElementById('reminder-btn');
    btn.classList.add('loading');
    btn.disabled = true;

    try {
        const res = await fetch('/api/reminders/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                eventName: currentSchema.title.replace(' - Registration Form', ''),
                rounds,
            }),
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Preview failed.');

        currentReminderDrafts = data.data;
        renderReminderPreview(data.data);
        document.getElementById('reminder-modal').classList.remove('hidden');
        showToast('Reminder previews generated!', 'success');
    } catch (e) {
        showToast(e.message || 'Failed to generate reminders.', 'error');
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

function renderReminderPreview(data) {
    const body = document.getElementById('reminder-modal-body');
    const footer = document.getElementById('reminder-modal-footer');
    const title = document.getElementById('reminder-modal-title');
    title.textContent = `Reminder Preview — ${data.eventName}`;

    body.innerHTML = data.reminders.map((r, i) => `
    <div class="reminder-card">
      <div class="reminder-card-header">
        <span class="reminder-round-name">${escapeHtml(r.roundName)}</span>
        <span class="reminder-round-date">${escapeHtml(r.roundDate)}</span>
      </div>
      <label class="reminder-label">Subject</label>
      <input class="reminder-subject-input" id="reminder-subject-${i}" value="${escapeHtml(r.subject)}" />
      <label class="reminder-label">Body</label>
      <textarea class="reminder-body-input" id="reminder-body-${i}" rows="8">${escapeHtml(r.body)}</textarea>
    </div>
  `).join('');

    // Show confirm button
    footer.style.display = '';
    document.getElementById('confirm-reminders-btn').style.display = '';
}

async function confirmReminders() {
    if (!currentReminderDrafts) return;

    // Collect (potentially edited) drafts from the modal inputs
    const reminders = currentReminderDrafts.reminders.map((r, i) => ({
        roundName: r.roundName,
        roundDate: r.roundDate,
        subject: document.getElementById(`reminder-subject-${i}`).value,
        body: document.getElementById(`reminder-body-${i}`).value,
    }));

    const btn = document.getElementById('confirm-reminders-btn');
    btn.classList.add('loading');
    btn.disabled = true;

    try {
        const res = await fetch('/api/reminders/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                eventName: currentReminderDrafts.eventName,
                reminders,
            }),
        });

        const data = await res.json();
        if (!data.success && !data.overallSuccess) {
            throw new Error(data.error || 'Reminder creation failed.');
        }

        renderReminderResult(data.data);
        showToast(`Reminders created! ${data.data.summary.succeeded} succeeded, ${data.data.summary.skipped} skipped.`, 'success');
    } catch (e) {
        showToast(e.message || 'Failed to create reminders.', 'error');
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

function renderReminderResult(data) {
    const body = document.getElementById('reminder-modal-body');
    const title = document.getElementById('reminder-modal-title');
    title.textContent = `Reminders Created — ${data.eventName}`;

    // Hide confirm button, show just close
    document.getElementById('confirm-reminders-btn').style.display = 'none';

    let html = '';

    // Summary bar
    html += `<div class="reminder-summary-bar">
    <span class="summary-stat summary-stat-ok">${data.summary.succeeded} created</span>
    <span class="summary-stat summary-stat-skip">${data.summary.skipped} skipped</span>
    ${data.summary.failed > 0 ? `<span class="summary-stat summary-stat-fail">${data.summary.failed} failed</span>` : ''}
  </div>`;

    // Drive folder link
    if (data.driveFolderUrl) {
        html += `<a href="${data.driveFolderUrl}" target="_blank" class="reminder-drive-link">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
      Open Drive Folder
    </a>`;
    }

    // Per-round results
    for (const round of data.rounds) {
        const statusClass = round.skipped ? 'round-skipped' : round.errors.length > 0 ? 'round-error' : 'round-ok';
        const statusIcon = round.skipped ? '⏭️' : round.errors.length > 0 ? '❌' : '✅';

        html += `<div class="reminder-result-card ${statusClass}">
      <div class="reminder-result-header">
        <span>${statusIcon} ${escapeHtml(round.roundName)}</span>
        ${round.skipped ? `<span class="skip-reason">${escapeHtml(round.skipReason || '')}</span>` : ''}
      </div>
      <div class="reminder-result-links">`;

        if (round.driveFile) {
            html += `<a href="${round.driveFile.fileUrl}" target="_blank" class="result-mini-link">📄 ${escapeHtml(round.driveFile.fileName)}</a>`;
        }
        if (round.calendarRoundEvent) {
            html += `<a href="${round.calendarRoundEvent.eventUrl}" target="_blank" class="result-mini-link">📆 Round Event</a>`;
        }
        if (round.calendarReminderEvent) {
            html += `<a href="${round.calendarReminderEvent.eventUrl}" target="_blank" class="result-mini-link">🔔 Send Reminder Event</a>`;
        }
        if (round.errors.length > 0) {
            html += `<div class="round-errors">${round.errors.map(e => escapeHtml(e)).join('<br>')}</div>`;
        }

        html += `</div></div>`;
    }

    body.innerHTML = html;
}

function closeReminderModal() {
    document.getElementById('reminder-modal').classList.add('hidden');
    currentReminderDrafts = null;
}

