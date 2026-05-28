/**
 * app.js — Frontend application logic for the C→C++ Transpiler
 */

// ─── Sample C code ─────────────────────────────────────────────
const SAMPLE_CODE = `#include <stdio.h>
#include <stdlib.h>

struct Point {
    int x;
    int y;
};

int main() {
    int num;
    char name[50];

    printf("Enter your name: ");
    scanf("%s", &name);

    printf("Hello, %s!\\n", name);

    printf("Enter a number: ");
    scanf("%d", &num);

    printf("You entered: %d\\n", num);

    // Dynamic memory
    int* arr = (int*) malloc(10 * sizeof(int));
    arr[0] = 42;
    printf("arr[0] = %d\\n", arr[0]);
    free(arr);

    struct Point p;
    p.x = 10;
    p.y = 20;
    printf("Point: (%d, %d)\\n", p.x, p.y);

    return 0;
}
`;

// ─── DOM Elements ──────────────────────────────────────────────
const $ = id => document.getElementById(id);

const cInput         = $('cInput');
const cppOutput      = $('cppOutput');
const btnCompile     = $('btnCompile');
const autoConvert    = $('autoConvert');
const statusDot      = $('statusDot');
const statusText     = $('statusText');
const transformLogInner = $('transformLogInner');
const outputEmptyState  = $('outputEmptyState');

// Stats
const inputLines  = $('inputLines');
const inputChars  = $('inputChars');
const outputLines = $('outputLines');
const outputChars = $('outputChars');
const transformCount = $('transformCount');

// Token tab
const tokenGrid    = $('tokenGrid');
const tokensEmpty  = $('tokensEmpty');
const tokenStatsBar = $('tokenStatsBar');

// Nav
const navBtns = document.querySelectorAll('.nav-btn');
const tabPanels = {
    editor:     $('tabEditor'),
    tokens:     $('tabTokens'),
    transforms: $('tabTransforms'),
    assistant:  $('tabAssistant'),
    about:      $('tabAbout'),
};

// ─── State ─────────────────────────────────────────────────────
let lastResult = null;
let autoDebounce = null;
let currentFilter = 'all';

// ─── Background Particles ──────────────────────────────────────
function initParticles() {
    const container = $('bgParticles');
    const colors = ['#6366f1', '#a855f7', '#22d3ee', '#10b981'];
    for (let i = 0; i < 18; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const size = Math.random() * 200 + 40;
        const color = colors[Math.floor(Math.random() * colors.length)];
        Object.assign(p.style, {
            width:  size + 'px',
            height: size + 'px',
            left:   Math.random() * 100 + '%',
            top:    Math.random() * 100 + '%',
            background: `radial-gradient(circle, ${color}22, transparent 70%)`,
            '--dur':   (Math.random() * 20 + 15) + 's',
            '--delay': (Math.random() * -20) + 's',
            '--dx':    (Math.random() * 120 - 60) + 'px',
            '--dy':    (Math.random() * -120 - 40) + 'px',
            '--op':    (Math.random() * 0.12 + 0.05).toFixed(2),
        });
        container.appendChild(p);
    }
}

// ─── Tab Navigation ────────────────────────────────────────────
function switchTab(tab) {
    navBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    Object.entries(tabPanels).forEach(([name, panel]) => {
        panel.classList.toggle('active', name === tab);
    });
}

navBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ─── Line Numbers ──────────────────────────────────────────────
function updateLineNumbers(textarea, containerId) {
    const lines = textarea.value.split('\n');
    const container = $(containerId);
    container.innerHTML = lines.map((_, i) => `<span>${i + 1}</span>`).join('');
    container.scrollTop = textarea.scrollTop;
}

function updateOutputLineNumbers(text) {
    const lines = text.split('\n');
    const container = $('outputLineNumbers');
    container.innerHTML = lines.map((_, i) => `<span>${i + 1}</span>`).join('');
}

cInput.addEventListener('input', () => {
    updateLineNumbers(cInput, 'inputLineNumbers');
    updateInputStats();
    if (autoConvert.checked) scheduleAutoCompile();
});

cInput.addEventListener('scroll', () => {
    $('inputLineNumbers').scrollTop = cInput.scrollTop;
});

// ─── Stats ─────────────────────────────────────────────────────
function updateInputStats() {
    const lines = cInput.value.split('\n').length;
    const chars = cInput.value.length;
    inputLines.textContent = `${lines} line${lines !== 1 ? 's' : ''}`;
    inputChars.textContent = `${chars} char${chars !== 1 ? 's' : ''}`;
}

function updateOutputStats(text, rulesCount) {
    const lines = text ? text.split('\n').length : 0;
    const chars = text ? text.length : 0;
    outputLines.textContent = `${lines} line${lines !== 1 ? 's' : ''}`;
    outputChars.textContent = `${chars} char${chars !== 1 ? 's' : ''}`;

    if (rulesCount > 0) {
        transformCount.textContent = `${rulesCount} transform${rulesCount !== 1 ? 's' : ''} applied`;
        transformCount.style.display = 'inline';
    } else {
        transformCount.style.display = 'none';
    }
}

// ─── Status ────────────────────────────────────────────────────
function setStatus(state, text) {
    statusDot.className = 'status-dot ' + state;
    statusText.textContent = text;
}

// ─── Compile ────────────────────────────────────────────────────
function doCompile() {
    const source = cInput.value.trim();
    if (!source) {
        showOutputEmpty();
        setStatus('', 'Ready');
        return;
    }

    setStatus('running', 'Converting...');
    btnCompile.classList.add('running');

    // Slight async delay for visual feedback
    setTimeout(() => {
        const result = compile(source);
        lastResult = result;
        btnCompile.classList.remove('running');

        if (result.success) {
            displayOutput(result.output, result.appliedRules, result.syntaxErrors);
            renderTransformLog(result.appliedRules);
            renderTokens(result.tokens);
            updateRuleBadges(result.appliedRules);
            const totalRules = Object.values(result.appliedRules).reduce((a, b) => a + b, 0);
            updateOutputStats(result.output, totalRules);
            setStatus('ready', 'Converted');
        } else {
            showError(result.error);
            setStatus('error', 'Error');
        }
    }, 120);
}

function scheduleAutoCompile() {
    clearTimeout(autoDebounce);
    autoDebounce = setTimeout(doCompile, 400);
}

btnCompile.addEventListener('click', doCompile);

autoConvert.addEventListener('change', () => {
    if (autoConvert.checked && cInput.value.trim()) doCompile();
});

// ─── Output ────────────────────────────────────────────────────
function displayOutput(outputCode, appliedRules, syntaxErrors = []) {
    outputEmptyState && (outputEmptyState.style.display = 'none');
    
    let errorBannerHtml = '';
    if (syntaxErrors.length > 0) {
        const errorList = syntaxErrors.map(e => 
            `<div class="syntax-error-item">
                <span class="syntax-error-line">Line ${e.line}:</span>
                <span class="syntax-error-msg">${escHtml(e.message)}</span>
            </div>`
        ).join('');
        
        errorBannerHtml = `
            <div class="syntax-error-banner">
                <div class="syntax-error-banner-header">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px; display: inline-block; vertical-align: middle;">
                        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                    </svg>
                    <span><strong>C Syntax Errors Detected:</strong></span>
                </div>
                <div class="syntax-error-banner-body">
                    ${errorList}
                </div>
            </div>
        `;
    }

    const highlighted = syntaxHighlightCpp(outputCode);
    cppOutput.innerHTML = errorBannerHtml + highlighted;
    updateOutputLineNumbers(outputCode);

    // Sync output scroll with line numbers
    cppOutput.addEventListener('scroll', () => {
        $('outputLineNumbers').scrollTop = cppOutput.scrollTop;
    }, { passive: true });
}

function showOutputEmpty() {
    cppOutput.innerHTML = `
        <div class="empty-state" id="outputEmptyState">
            <div class="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
            </div>
            <p>Your converted C++ code will appear here</p>
            <p class="empty-hint">Click <strong>Convert</strong> or enable <strong>auto-convert</strong></p>
        </div>`;
    updateOutputStats('', 0);
    $('outputLineNumbers').innerHTML = '';
}

function showError(msg) {
    cppOutput.innerHTML = `<div style="color:var(--rose);font-size:0.82rem;padding:8px;">
        <strong>Conversion Error:</strong> ${escHtml(msg)}
    </div>`;
}

// ─── Transform log ─────────────────────────────────────────────
function renderTransformLog(rules) {
    const entries = [];

    if (rules.stdio > 0) {
        entries.push({ cls: 'info', icon: '#', label: `Headers replaced` });
    }
    if (rules.printf > 0) {
        entries.push({ cls: 'success', icon: '⚡', label: `printf→cout ×${rules.printf}` });
    }
    if (rules.scanf > 0) {
        entries.push({ cls: 'success', icon: '⚡', label: `scanf→cin ×${rules.scanf}` });
    }
    if (rules.malloc > 0) {
        entries.push({ cls: 'success', icon: '⊕', label: `malloc→new ×${rules.malloc}` });
    }
    if (rules.free > 0) {
        entries.push({ cls: 'success', icon: '⊖', label: `free→delete ×${rules.free}` });
    }
    if (rules.struct > 0) {
        entries.push({ cls: 'success', icon: '{}', label: `struct→class ×${rules.struct}` });
    }

    if (entries.length === 0) {
        transformLogInner.innerHTML = `<span class="log-entry info">✓ No specific C→C++ transformations needed — code passed through cleanly.</span>`;
        return;
    }

    transformLogInner.innerHTML = entries.map(e =>
        `<span class="log-entry ${e.cls}">${escHtml(e.icon)} ${escHtml(e.label)}</span>`
    ).join('');
}

// ─── Token rendering ────────────────────────────────────────────
const TOKEN_COLORS = {
    KEYWORD:        '#c084fc',
    IDENTIFIER:     '#7dd3fc',
    STRING_LITERAL: '#86efac',
    NUMBER:         '#fbbf24',
    SYMBOL:         '#fb923c',
    PREPROCESSOR:   '#f472b6',
    COMMENT:        '#64748b',
};

function renderTokens(tokens) {
    if (!tokens || tokens.length === 0) {
        tokenGrid.innerHTML = '';
        tokenGrid.appendChild(tokensEmpty);
        return;
    }

    // Stats
    const counts = {};
    for (const t of tokens) {
        counts[t.type] = (counts[t.type] || 0) + 1;
    }

    tokenStatsBar.innerHTML = Object.entries(counts).map(([type, count]) => {
        const color = TOKEN_COLORS[type] || '#94a3b8';
        return `<span class="stat-chip">
            <span class="stat-chip-dot" style="background:${color}"></span>
            <span>${type}</span>
            <strong>${count}</strong>
        </span>`;
    }).join('');

    renderFilteredTokens(tokens, currentFilter);
}

function renderFilteredTokens(tokens, filter) {
    const filtered = filter === 'all' ? tokens : tokens.filter(t => t.type === filter);

    if (filtered.length === 0) {
        tokenGrid.innerHTML = `<div class="tokens-empty"><p>No ${filter.toLowerCase()} tokens found.</p></div>`;
        return;
    }

    tokenGrid.innerHTML = filtered.map(t => {
        const displayVal = t.value.replace(/\n/g, '↵').replace(/\t/g, '→').replace(/\r/g, '');
        const truncated = displayVal.length > 40 ? displayVal.slice(0, 40) + '…' : displayVal;
        return `<span class="token-chip ${t.type}" title="${escHtml(t.type)}: ${escHtml(t.value)}">
            <span class="token-val">${escHtml(truncated || '(empty)')}</span>
            <span class="type-label">${t.type.replace('_', ' ')}</span>
        </span>`;
    }).join('');
}

// Token filter buttons
document.querySelectorAll('.token-filter').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.token-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        if (lastResult && lastResult.tokens) {
            renderFilteredTokens(lastResult.tokens, currentFilter);
        }
    });
});

// ─── Rule badges ───────────────────────────────────────────────
function updateRuleBadges(rules) {
    const mapping = {
        stdio:  { badgeId: 'badgeStdio',  cardId: 'ruleStdio' },
        printf: { badgeId: 'badgePrintf', cardId: 'rulePrintf' },
        scanf:  { badgeId: 'badgeScanf',  cardId: 'ruleScanf' },
        malloc: { badgeId: 'badgeMalloc', cardId: 'ruleMalloc' },
        free:   { badgeId: 'badgeFree',   cardId: 'ruleFree' },
        struct: { badgeId: 'badgeStruct', cardId: 'ruleStruct' },
    };

    for (const [rule, { badgeId, cardId }] of Object.entries(mapping)) {
        const count = rules[rule] || 0;
        const badge = $(badgeId);
        const card  = $(cardId);
        if (count > 0) {
            badge.textContent = `×${count}`;
            badge.classList.add('applied');
            card.classList.add('applied');
        } else {
            badge.textContent = '—';
            badge.classList.remove('applied');
            card.classList.remove('applied');
        }
    }
}

// ─── Buttons ───────────────────────────────────────────────────
$('btnLoadSample').addEventListener('click', () => {
    cInput.value = SAMPLE_CODE;
    updateLineNumbers(cInput, 'inputLineNumbers');
    updateInputStats();
    if (autoConvert.checked) doCompile();
    showToast('Sample C code loaded');
});

$('btnClearInput').addEventListener('click', () => {
    cInput.value = '';
    updateLineNumbers(cInput, 'inputLineNumbers');
    updateInputStats();
    showOutputEmpty();
    transformLogInner.innerHTML = '<span class="log-placeholder">Conversion log will appear here after processing...</span>';
    tokenGrid.innerHTML = '';
    tokenGrid.appendChild(tokensEmpty);
    tokenStatsBar.innerHTML = '';
    lastResult = null;
    setStatus('', 'Ready');
    // Reset rule badges
    updateRuleBadges({ stdio:0, printf:0, scanf:0, malloc:0, free:0, struct:0 });
    showToast('Input cleared');
});

$('btnCopyInput').addEventListener('click', () => {
    copyToClipboard(cInput.value, 'Input copied to clipboard');
});

$('btnCopyOutput').addEventListener('click', () => {
    if (!lastResult || !lastResult.success) { showToast('Nothing to copy'); return; }
    copyToClipboard(lastResult.output, 'Output copied to clipboard');
});

$('btnDownloadOutput').addEventListener('click', () => {
    if (!lastResult || !lastResult.success) { showToast('Nothing to download'); return; }
    downloadFile(lastResult.output, 'output.cpp', 'text/plain');
    showToast('Downloading output.cpp');
});

// ─── Helpers ────────────────────────────────────────────────────
function copyToClipboard(text, msg) {
    if (!text) { showToast('Nothing to copy'); return; }
    navigator.clipboard.writeText(text).then(() => showToast(msg)).catch(() => {
        // fallback
        const el = document.createElement('textarea');
        el.value = text;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        showToast(msg);
    });
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Toast ─────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg) {
    const toast = $('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

// ─── Keyboard shortcut: Ctrl+Enter to compile ──────────────────
document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        doCompile();
    }
});

// ─── Init ──────────────────────────────────────────────────────
function init() {
    initParticles();
    updateLineNumbers(cInput, 'inputLineNumbers');
    updateInputStats();
    setStatus('ready', 'Ready');

    // Load sample by default for a great first impression
    cInput.value = SAMPLE_CODE;
    updateLineNumbers(cInput, 'inputLineNumbers');
    updateInputStats();
    doCompile();
}

init();

// ─── AI Assistant Feature ─────────────────────────────────────────
const GEMINI_API_KEY = 'AIzaSyA2HMWjPt8S9k_387PwmsP-aPvXv204Xxc';

const SAMPLE_AI_CODE = `#include <stdio.h>

struct Point {
    int x;
    int y;
} // Missing semicolon here

int main() {
    struct Point p;
    p.x = 10;
    p.y = 20;
    printf("Point: (%d, %d)\\n", p.x, p.y);
    return 0;
}`;

const SAMPLE_AI_ERROR = `main.c:7:1: error: expected ';' after struct definition
}
^
;`;

// Elements
const aiCodeInput     = $('aiCodeInput');
const aiErrorInput    = $('aiErrorInput');
const btnAnalyzeError = $('btnAnalyzeError');
const aiSpinner       = $('aiSpinner');
const aiResultsArea   = $('aiResultsArea');
const btnLoadAISample = $('btnLoadAISample');
const btnClearAIInput = $('btnClearAIInput');

// Load Sample
btnLoadAISample && btnLoadAISample.addEventListener('click', () => {
    aiCodeInput.value = SAMPLE_AI_CODE;
    aiErrorInput.value = SAMPLE_AI_ERROR;
    showToast('Sample error loaded');
});

// Clear Inputs
btnClearAIInput && btnClearAIInput.addEventListener('click', () => {
    aiCodeInput.value = '';
    aiErrorInput.value = '';
    aiResultsArea.innerHTML = `
        <div class="empty-state" id="aiEmptyState">
            <div class="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                </svg>
            </div>
            <p>Your compiler error analysis will appear here</p>
            <p class="empty-hint">Provide the code and error, then click <strong>Analyze Error</strong></p>
        </div>
    `;
    showToast('AI Assistant inputs cleared');
});

// Analyze
btnAnalyzeError && btnAnalyzeError.addEventListener('click', async () => {
    const code = aiCodeInput.value.trim();
    const errorMsg = aiErrorInput.value.trim();

    if (!code || !errorMsg) {
        showToast('Please provide both the source code and the compiler error message.');
        return;
    }

    setAILoading(true);

    try {
        const systemPrompt = `You are an expert C and C++ compiler assistant.

Your task is to analyze compiler errors and explain them in simple, beginner-friendly language.

You MUST:
1. Identify the actual issue from the compiler error.
2. Explain the error in simple human language.
3. Mention the line number if available.
4. Explain WHY the error happened.
5. Suggest the correct fix.
6. Provide corrected code snippet only for the problematic part.
7. Mention if the issue is syntax, memory, type, scope, or logic related.
8. Keep explanations concise but clear.
9. If multiple errors exist, explain them one by one.
10. Never give vague answers.

Return ONLY valid JSON in this exact format:

{
  "errors": [
    {
      "line": "line number or 'unknown'",
      "error_type": "one of: syntax, memory, type, scope, logic",
      "compiler_message": "the original error message from the compiler",
      "human_explanation": "simple human explanation",
      "why_it_happened": "why this error occurred",
      "fix_suggestion": "what should be done to fix it",
      "corrected_code": "the corrected code block for the problematic part",
      "severity": "one of: High, Medium, Low"
    }
  ]
}`;

        const userPrompt = `Compiler Error:
${errorMsg}

Original Code:
${code}`;

        const payload = {
            contents: [
                {
                    parts: [
                        {
                            text: `${systemPrompt}\n\n${userPrompt}`
                        }
                    ]
                }
            ],
            generationConfig: {
                responseMimeType: "application/json"
            }
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const responseData = await response.json();
        const responseText = responseData.candidates[0].content.parts[0].text;
        const analysisResult = JSON.parse(responseText);

        renderAIResults(analysisResult);
        showToast('Analysis completed successfully!');
    } catch (err) {
        console.error(err);
        aiResultsArea.innerHTML = `
            <div style="color:var(--rose);font-size:0.85rem;padding:16px;background:rgba(244,63,94,0.06);border:1px solid rgba(244,63,94,0.2);border-radius:var(--radius);line-height:1.5;">
                <strong>AI Analysis Failed:</strong> ${escHtml(err.message)}<br><br>
                Please check your API key, internet connection, or try again later.
            </div>
        `;
        showToast('Error during AI analysis');
    } finally {
        setAILoading(false);
    }
});

function setAILoading(loading) {
    if (loading) {
        btnAnalyzeError.classList.add('running');
        aiSpinner.style.display = 'block';
        aiResultsArea.innerHTML = `
            <div class="ai-loading-card">
                <div class="skeleton-text short"></div>
                <div class="skeleton-text long"></div>
                <div class="skeleton-text medium"></div>
            </div>
            <div class="ai-loading-card">
                <div class="skeleton-text short"></div>
                <div class="skeleton-text long"></div>
                <div class="skeleton-text medium"></div>
                <div class="skeleton-text long"></div>
            </div>
        `;
    } else {
        btnAnalyzeError.classList.remove('running');
        aiSpinner.style.display = 'none';
    }
}

function renderAIResults(data) {
    if (!data.errors || data.errors.length === 0) {
        aiResultsArea.innerHTML = `
            <div class="empty-state">
                <p>No compiler errors identified by the AI.</p>
            </div>
        `;
        return;
    }

    aiResultsArea.innerHTML = data.errors.map((err, index) => {
        const severityClass = err.severity ? `sev-${err.severity.toLowerCase()}` : 'sev-low';
        const lineText = err.line && err.line !== 'unknown' ? `Line ${err.line}` : 'Error Details';

        return `
            <div class="ai-error-card">
                <div class="ai-card-header">
                    <span class="ai-card-title">${escHtml(lineText)}</span>
                    <div class="ai-card-meta">
                        ${err.error_type ? `<span class="ai-badge type-badge">${escHtml(err.error_type)}</span>` : ''}
                        ${err.severity ? `<span class="ai-badge ${severityClass}">${escHtml(err.severity)}</span>` : ''}
                    </div>
                </div>
                <div class="ai-card-body">
                    <div class="ai-message-block">
                        ${escHtml(err.compiler_message || 'No compiler message details provided.')}
                    </div>
                    
                    <div class="ai-expl-section">
                        <span class="ai-section-title">Explanation</span>
                        <p class="ai-section-text">${escHtml(err.human_explanation || 'No explanation provided.')}</p>
                    </div>

                    <div class="ai-expl-section">
                        <span class="ai-section-title">Why It Happened</span>
                        <p class="ai-section-text">${escHtml(err.why_it_happened || 'No details on why it occurred.')}</p>
                    </div>

                    <div class="ai-expl-section">
                        <span class="ai-section-title">Suggested Fix</span>
                        <p class="ai-section-text">${escHtml(err.fix_suggestion || 'No fix suggestion provided.')}</p>
                    </div>

                    ${err.corrected_code ? `
                    <div class="ai-code-diff-box">
                        <div class="ai-diff-header">
                            <span class="ai-diff-title">Corrected Code Snippet</span>
                            <button class="action-btn" onclick="copyAICode(${index})" id="copyFixBtn-${index}">
                                Copy Fix
                            </button>
                        </div>
                        <pre class="ai-diff-body" id="aiCorrectedCode-${index}">${escHtml(err.corrected_code)}</pre>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    // Inject copy function globally so HTML inline onclick can call it
    window.copyAICode = (index) => {
        const codeElement = document.getElementById(`aiCorrectedCode-${index}`);
        if (codeElement) {
            copyToClipboard(codeElement.textContent, 'Corrected code copied to clipboard!');
        }
    };
}

// ─── Coliru C++ Compilation and Execution ──────────────────────────
const btnRunOutput      = $('btnRunOutput');
const terminalPanel     = $('terminalPanel');
const terminalBody      = $('terminalBody');
const btnHideTerminal   = $('btnHideTerminal');

btnRunOutput && btnRunOutput.addEventListener('click', async () => {
    if (!lastResult || !lastResult.success || !lastResult.output) {
        showToast('Please convert some code first');
        return;
    }
    
    // Show terminal
    terminalPanel.style.display = 'flex';
    terminalBody.className = 'terminal-body running';
    terminalBody.textContent = 'Compiling and executing code on Coliru... Please wait.';
    
    try {
        const payload = {
            cmd: "g++ -O3 -Wall -std=c++17 main.cpp && ./a.out",
            src: lastResult.output
        };
        
        const response = await fetch('https://coliru.stacked-crooked.com/compile', {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`Server returned HTTP ${response.status}`);
        }
        
        const outputText = await response.text();
        
        terminalBody.className = 'terminal-body';
        terminalBody.textContent = outputText || '(Program finished with empty output)';
        
        // Auto scroll terminal to bottom
        terminalBody.scrollTop = terminalBody.scrollHeight;
        
        showToast('Program executed');
    } catch (err) {
        console.error(err);
        terminalBody.className = 'terminal-body error';
        terminalBody.textContent = `Compilation/Execution Failed:\n${err.message}`;
        showToast('Execution failed');
    }
});

btnHideTerminal && btnHideTerminal.addEventListener('click', () => {
    terminalPanel.style.display = 'none';
});

// Automatically hide terminal if input is cleared
const originalClearBtn = $('btnClearInput');
originalClearBtn && originalClearBtn.addEventListener('click', () => {
    terminalPanel.style.display = 'none';
    terminalBody.textContent = '';
});



