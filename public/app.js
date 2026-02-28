// ═══════════════════════════════════════════════════════════════════════════
//  FormForge AI — Frontend Logic
// ═══════════════════════════════════════════════════════════════════════════

let currentSchema = null;

// ─── Init ─────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();

    // Handle auth redirect
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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        Connected
      `;
            btn.disabled = true;
            btn.style.opacity = '0.6';
        } else {
            badge.className = 'auth-badge disconnected';
            badge.querySelector('.auth-text').textContent = 'Google Disconnected';
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
            showToast('Failed to get auth URL. Check your Google credentials in .env', 'error');
        }
    } catch (e) {
        showToast('Failed to connect to server.', 'error');
    }
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

    try {
        const res = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
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
    // Show step 2
    document.getElementById('step2').classList.remove('hidden');
    document.getElementById('step2').scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Event badges
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

    // Summary grid — extract from description
    const summaryGrid = document.getElementById('summary-grid');
    const summaryItems = extractSummaryFromDescription(schema.description);
    summaryGrid.innerHTML = summaryItems.map(item => `
    <div class="summary-item">
      <div class="summary-label">${item.label}</div>
      <div class="summary-value">${item.value}</div>
    </div>
  `).join('');

    // Fields list
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

    // JSON preview
    document.getElementById('json-preview').textContent = JSON.stringify(schema, null, 2);
}

function extractSummaryFromDescription(desc) {
    const items = [];
    const patterns = [
        { regex: /EVENT MODE[:\s]*(.+)/i, label: 'Mode' },
        { regex: /EVENT DATE[:\s]*(.+)/i, label: 'Date' },
        { regex: /REGISTRATION DEADLINE[:\s]*(.+)/i, label: 'Deadline' },
        { regex: /PRIZE MONEY[:\s]*(.+)/i, label: 'Prize' },
        { regex: /TEAM SIZE[:\s]*(.+)/i, label: 'Team Size' },
    ];

    for (const p of patterns) {
        const match = desc.match(p.regex);
        if (match) {
            items.push({ label: p.label, value: match[1].trim() });
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
    document.getElementById('event-text').value = '';
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
