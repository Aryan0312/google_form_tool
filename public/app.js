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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
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
            showToast('Failed to get auth URL. Check Google credentials in .env', 'error');
        }
    } catch (e) {
        showToast('Failed to connect to server.', 'error');
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
      <span class="chip-name">${chip.name}</span>
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
