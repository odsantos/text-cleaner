// Helper: get text source depending on checkbox and if output has content
function getSourceText() {
    const applyToOutput = document.getElementById('applyToOutput').checked;
    const output = document.getElementById('outputText').value.trim();
    if (applyToOutput && output.length > 0) return output;
    return document.getElementById('inputText').value;
}

function setOutput(text) {
    document.getElementById('outputText').value = text;
    updateStats();
}

// Basic cleaning: strip HTML, normalize spaces, remove non-printable
function cleanText() {
    let text = getSourceText();

    text = stripHtml(text);
    text = text.replace(/\u200B/g, ''); // zero-width space removal
    text = text.replace(/\r\n/g, '\n'); // unify line endings
    text = text.replace(/\t+/g, ' ');
    text = text.replace(/[ \t]+\n/g, '\n'); // trailing spaces before newline
    text = text.replace(/\n{3,}/g, '\n\n'); // collapse multiple blank lines to 2
    text = text.replace(/[ \u00A0]{2,}/g, ' '); // multiple spaces & &nbsp;
    text = text.trim();

    if (document.getElementById('removeAccents').checked) {
        text = removeAccents(text);
    }

    setOutput(text);
}

// Uppercase / Lowercase / Title case
function toUpperCaseText() {
    const text = getSourceText();
    setOutput(text.toUpperCase());
}
function toLowerCaseText() {
    const text = getSourceText();
    setOutput(text.toLowerCase());
}
function toTitleCase() {
    let text = getSourceText().toLowerCase();
    // Basic title-case: capitalize word starts, keep punctuation as is
    text = text.replace(/\w\S*/g, function (word) {
        return word.charAt(0).toUpperCase() + word.substr(1);
    });
    setOutput(text);
}

// Lines transformations
function removeDuplicateLines() {
    let text = getSourceText();
    const lines = text.split(/\r?\n/);
    const seen = new Set();
    const out = [];
    for (let l of lines) {
        const key = l.trim();
        if (!seen.has(key)) {
            seen.add(key);
            out.push(l);
        }
    }
    setOutput(out.join("\n"));
}

function sortLines() {
    let text = getSourceText();
    const lines = text.split(/\r?\n/);
    // stable-ish sort ignoring leading/trailing spaces
    lines.sort((a, b) => a.trim().localeCompare(b.trim(), undefined, { sensitivity: 'base' }));
    setOutput(lines.join("\n"));
}

function removeBlankLines() {
    let text = getSourceText();
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    setOutput(lines.join("\n"));
}

// HTML & non-printable removal helpers
function stripHtml(str) {
    // minimal, safe HTML tag stripper (keeps text content)
    return str.replace(/<[^>]*>/g, '');
}

function removeHtmlTags() {
    let text = getSourceText();
    setOutput(stripHtml(text));
}

function removeNonPrintable() {
    let text = getSourceText();
    // Keep basic printable Unicode chars and newlines; remove control chars except \n
    text = text.replace(/[^\P{Cc}\n]+/gu, ''); // attempt: remove control characters (ES2018+)
    // fallback for environments without Unicode escape support:
    // text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    setOutput(text);
}

function normalizeSpaces() {
    let text = getSourceText();
    text = text.replace(/\u00A0/g, ' '); // nbsp
    text = text.replace(/[ \t]{2,}/g, ' '); // repeated spaces/tabs
    text = text.replace(/\s*\n\s*/g, '\n'); // trim lines
    setOutput(text.trim());
}

// Remove accents / diacritics
function removeAccents(s) {
    // NFD decomposition + remove combining marks
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Copy & Download & Swap
function copyText() {
    const out = document.getElementById('outputText');
    const text = out.value.trim();

    if (!text) {
        showToast("Nothing to copy!", "bg-danger");
        return;
    }

    out.select();
    out.setSelectionRange(0, 999999); // mobile
    document.execCommand('copy');

    showToast("Copied to clipboard!", "bg-success");
    out.blur();
}

function showToast(message, bgClass = "bg-dark") {
    const toast = document.createElement("div");
    toast.classList.add("toast-message"); // marker class for clearing later
    toast.className += ` position-fixed bottom-0 end-0 m-3 px-3 py-2 text-white rounded shadow d-flex align-items-center ${bgClass}`;
    toast.style.zIndex = 1050;

    // Message text
    const span = document.createElement("span");
    span.textContent = message;
    span.className = "me-2";
    toast.appendChild(span);

    // Close button (narrower)
    const btn = document.createElement("button");
    btn.textContent = "×";
    btn.className = "btn btn-sm btn-light";
    btn.style.padding = "0 6px";
    btn.style.lineHeight = "1";
    btn.style.fontSize = "1rem";
    btn.onclick = () => toast.remove();
    toast.appendChild(btn);

    document.body.appendChild(toast);
}

function resetAll() {
    // Clear both input and output
    document.getElementById('inputText').value = '';
    document.getElementById('outputText').value = '';

    // Reset checkboxes to defaults
    document.getElementById('applyToOutput').checked = true;
    document.getElementById('removeAccents').checked = false;

    // Clear all toast messages
    document.querySelectorAll('.toast-message').forEach(el => el.remove());

    // Update stats display
    updateStats();
}

function downloadText() {
    const text = document.getElementById('outputText').value.trim();

    if (!text) {
        showToast("Nothing to download!", "bg-danger");
        return;
    }

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'text-cleaner-output.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    showToast("File downloaded!", "bg-success");
}

function swapInputOutput() {
    const inp = document.getElementById('inputText');
    const out = document.getElementById('outputText');
    const t = inp.value;
    inp.value = out.value;
    out.value = t;
    updateStats();
}

// Stats update (words/chars) for both fields
function countWords(s) {
    if (!s) return 0;
    // Compatible word count: match sequences of letters/numbers/apostrophes/hyphens
    // Works without Unicode property escapes
    const matches = s.trim().match(/\b[\w'-]+\b/g);
    return matches ? matches.length : 0;
}

function updateStats() {
    const input = document.getElementById('inputText').value;
    const output = document.getElementById('outputText').value;
    document.getElementById('inputStats').textContent = `Words: ${countWords(input)} • Chars: ${input.length}`;
    document.getElementById('outputStats').textContent = `Words: ${countWords(output)} • Chars: ${output.length}`;
}

// ===== Theme Toggle =====
const themeToggle = document.getElementById('themeToggle');

// Get saved theme or default to light
const savedTheme = localStorage.getItem('theme') || 'theme-light';
document.body.classList.add(savedTheme);
updateThemeButtonText(savedTheme);

// Toggle theme on click
themeToggle.addEventListener('click', () => {
    const newTheme = document.body.classList.contains('theme-light') ? 'theme-dark' : 'theme-light';

    // Remove both classes, then add new one
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(newTheme);

    // Save choice
    localStorage.setItem('theme', newTheme);

    // Update button text
    updateThemeButtonText(newTheme);
});

// Update button label
function updateThemeButtonText(theme) {
    themeToggle.textContent = theme === 'theme-light' ? '🌙 Dark' : '☀️ Light';
}

// update stats live
document.getElementById('inputText').addEventListener('input', updateStats);
document.getElementById('outputText').addEventListener('input', updateStats);

// initial stats
updateStats();
