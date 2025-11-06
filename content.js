/**
 * Vault Search Extension - Content Script
 * Author: Sandesh Sachdev
 * Version: 2.0.0
 *
 * Provides blazing-fast path-first search for HashiCorp Vault with deep value scanning
 */

function log(...args){ console.debug("[Vault UI Search]", ...args); }

// Matchers
function fuzzyRatio(a, b) {
  const x = (a || "").toLowerCase();
  const y = (b || "").toLowerCase();
  if (!x || !y) return 0;
  const bigrams = s => new Set([...s].map((_, i) => s.slice(i, i + 2)).filter(t => t.length === 2));
  const xb = bigrams(x), yb = bigrams(y);
  const inter = [...xb].filter(t => yb.has(t)).length;
  return (2 * inter) / (xb.size + yb.size || 1);
}
function matchText(text, pattern, { mode = "contains", similarity = 0.8, caseInsensitive = false } = {}) {
  if (!pattern) return false;
  const T = caseInsensitive ? String(text ?? "").toLowerCase() : String(text ?? "");
  const P = caseInsensitive ? String(pattern).toLowerCase() : String(pattern);
  if (mode === "exact") return T === P;
  if (mode === "contains") return T.includes(P);
  if (mode === "regex") { try { return new RegExp(pattern, caseInsensitive ? "i" : undefined).test(String(text ?? "")); } catch { return false; } }
  if (mode === "fuzzy") return fuzzyRatio(T, P) >= similarity;
  return false;
}

// URL/namespace
function getVaultAddrFromLocation() { return window.location.origin; }
function getNamespaceFromStorage() {
  const keys = ["vault:namespace","namespace","X-Vault-Namespace"];
  for (const store of [localStorage, sessionStorage]) {
    for (const k of keys) {
      const v = store.getItem(k);
      if (v && typeof v === "string") return v.replace(/^\/+|\/+$/g, "");
    }
  }
  return null;
}

// Token helpers - Enhanced with background service integration
async function getTokenFromExtensionSettings() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_AUTH' });
    if (response && response.authenticated) {
      return {
        token: response.token,
        vaultUrl: response.vaultUrl,
        namespace: response.namespace
      };
    }
  } catch (error) {
    log("Failed to get auth from extension:", error);
  }
  return null;
}

async function getTokenFromCopyButton() {
  const btn = document.querySelector('li#container button.hds-copy-button, li#container .hds-copy-button, button.hds-copy-button');
  if (!btn) throw new Error("Copy token button not found. Open the menu where it appears.");
  btn.click();
  await new Promise(r => setTimeout(r, 150));
  const txt = await navigator.clipboard.readText();
  if (!txt || txt.length < 10) throw new Error("Clipboard did not contain a token—make sure Copy token worked.");
  sessionStorage.setItem("vault_ui_search_token", txt);
  return txt;
}
async function getTokenFromPage(autoOnly=false) {
  // First try to get from extension settings (standalone mode)
  const extensionAuth = await getTokenFromExtensionSettings();
  if (extensionAuth) {
    log("Using token from extension settings");
    return extensionAuth;
  }

  // Fallback to existing page-based token discovery
  const candidates = ['vault:token','vault.token','token','auth.clientToken','vault:auth'];
  for (const store of [localStorage, sessionStorage]) {
    for (const key of candidates) {
      const raw = store.getItem(key);
      if (!raw) continue;
      try { const obj = JSON.parse(raw); if (obj && typeof obj === 'object' && obj.client_token) return obj.client_token; } catch{}
      if (/^[A-Za-z0-9\-_.]{16,}$/.test(raw)) return raw;
    }
  }
  const pasted = sessionStorage.getItem("vault_ui_search_token");
  if (pasted && /^[A-Za-z0-9\-_.]{16,}$/.test(pasted)) return { token: pasted };
  if (autoOnly) throw new Error('No token auto-discovered. Please configure in extension settings (click the extension icon).');
  const manual = prompt("Vault token not found automatically. Paste your X-Vault-Token (or configure in extension settings):");
  if (manual) {
    sessionStorage.setItem("vault_ui_search_token", manual);
    return { token: manual };
  }
  throw new Error('Vault token not found. Please configure the extension by clicking its icon.');
}

// fetch with timeout
async function fetchJSON(url, token, namespace, { timeoutMs = 10000 } = {}) {
  const headers = {'X-Vault-Token': token};
  if (namespace) headers['X-Vault-Namespace'] = namespace;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
    return res.json();
  } finally {
    clearTimeout(t);
  }
}
function isKV2(info) { return String(info?.options?.version || '1') === '2'; }

// Mount discovery
async function listKVMounts(base, token, namespace) {
  const uniq = new Map();
  try {
    const data = await fetchJSON(`${base}/v1/sys/mounts`, token, namespace, { timeoutMs: 8000 });
    const mounts = data?.data || data;
    for (const [path, info] of Object.entries(mounts)) {
      if (info?.type !== 'kv') continue;
      uniq.set(path, { mount: path, kv2: isKV2(info) });
    }
  } catch (e) { log("sys/mounts failed:", e.message); }
  const anchors = [...document.querySelectorAll('a[href*="/ui/vault/secrets/"]')];
  for (const a of anchors) {
    const m = a.getAttribute("href").match(/\/ui\/vault\/secrets\/([^/]+)\//);
    if (m && m[1]) uniq.set(`${m[1]}/`, { mount: `${m[1]}/`, kv2: true });
  }
  if (!uniq.size) uniq.set("secret/", { mount: "secret/", kv2: true });
  return [...uniq.values()];
}

// List/read helpers
async function listKV(base, token, mount, kv2, prefix = '', namespace) {
  const enc = encodeURIComponent(prefix);
  const url = kv2 ? `${base}/v1/${mount}metadata/${enc}?list=true` : `${base}/v1/${mount}${enc}?list=true`;
  try {
    const json = await fetchJSON(url, token, namespace, { timeoutMs: 8000 });
    return { keys: json?.data?.keys || [] };
  } catch (e) {
    if (String(e.message).startsWith("404") && kv2) return { _flip_to_kv1: true, keys: [] };
    if (String(e.message).startsWith("403")) return { keys: [] };
    throw e;
  }
}
async function readKV(base, token, mount, kv2, path, namespace) {
  const enc = encodeURIComponent(path);
  const url = kv2 ? `${base}/v1/${mount}data/${enc}` : `${base}/v1/${mount}${enc}`;
  try {
    const json = await fetchJSON(url, token, namespace, { timeoutMs: 10000 });
    return kv2 ? (json?.data?.data || {}) : (json?.data || {});
  } catch (e) {
    if (String(e.message).startsWith("404") && kv2) {
      const json = await fetchJSON(`${base}/v1/${mount}${enc}`, token, namespace, { timeoutMs: 10000 });
      return json?.data || {};
    }
    throw e;
  }
}

// Utils
function traverseForMatches(data, term, opts, maxDepth, keyMatches, valueMatches, jsonPath = '', depth = 0) {
  if (depth > maxDepth) return;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    for (const [k, v] of Object.entries(data)) {
      const np = jsonPath ? `${jsonPath}.${k}` : k;
      if (matchText(k, term, opts)) keyMatches.push({ jsonPath: np, value: v });
      if (typeof v !== 'object' || v === null) {
        if (matchText(String(v), term, opts)) valueMatches.push({ jsonPath: np, value: v });
      } else {
        traverseForMatches(v, term, opts, maxDepth, keyMatches, valueMatches, np, depth + 1);
      }
    }
  } else if (Array.isArray(data)) {
    data.forEach((item, i) => {
      const np = `${jsonPath}[${i}]`;
      if (typeof item !== 'object' || item === null) {
        if (matchText(String(item), term, opts)) valueMatches.push({ jsonPath: np, value: item });
      } else {
        traverseForMatches(item, term, opts, maxDepth, keyMatches, valueMatches, np, depth + 1);
      }
    });
  }
}

// Two-phase search: Phase A (path-only), Phase B (deep read on candidates)
async function universalSearch({ base, token, term, match = 'contains', similarity = 0.8, caseInsensitive = true, maxDepth = 10, showAll = false, signal, namespace, workers = 48, mountFilter = '', prefixFilter = '' , onYield }) {
  const mounts = await listKVMounts(base, token, namespace);
  const kvVersionMap = new Map(mounts.map(m => [m.mount, m.kv2]));
  const pathCandidates = []; // Phase A output
  const seenPaths = new Set();
  const opts = { mode: match, similarity, caseInsensitive };

  const applyMount = (m) => !mountFilter || m.mount.startsWith(mountFilter);
  const applyPrefix = (p) => !prefixFilter || p.startsWith(prefixFilter);

  // Use provided base URL or fall back to location
  const effectiveBase = base || getVaultAddrFromLocation();

  // PHASE A: list-only, path prefilter (super fast)
  const listQueue = [];
  for (const m of mounts) if (applyMount(m)) listQueue.push({ mount: m.mount, prefix: '' });

  async function listWorker() {
    while (listQueue.length) {
      if (signal?.aborted) return;
      const { mount, prefix } = listQueue.shift();
      if (!applyPrefix(prefix)) continue;
      let kv2 = kvVersionMap.get(mount);
      let listed;
      try { listed = await listKV(base, token, mount, kv2, prefix, namespace); }
      catch(e){ log("listKV error", mount, prefix, e.message); continue; }
      if (listed._flip_to_kv1) { kvVersionMap.set(mount, false); kv2 = false; listed.keys = []; }
      for (const k of listed.keys) {
        if (k.endsWith('/')) { listQueue.push({ mount, prefix: `${prefix}${k}` }); continue; }
        const fullPath = `${mount}${prefix}${k}`;
        const segments = fullPath.split('/').filter(Boolean);
        let matched = matchText(fullPath, term, opts);
        if (!matched) for (const seg of segments) { if (matchText(seg, term, opts)) { matched = true; break; } }
        if (matched && !seenPaths.has(fullPath)) {
          seenPaths.add(fullPath);
          pathCandidates.push({ mount, kv2, path: `${prefix}${k}`, fullPath });
          // stream candidate to UI quickly
          onYield && onYield({ type: "path", mount, kv2, path: `${prefix}${k}`, fullPath });
        }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(workers, 64) }, () => listWorker()));

  // PHASE B: deep scan only on candidates
  const readQueue = pathCandidates.slice();
  const results = [];
  async function readWorker() {
    while (readQueue.length) {
      if (signal?.aborted) return;
      const { mount, kv2, path, fullPath } = readQueue.shift();
      let data = {};
      try { data = await readKV(base, token, mount, kv2, path, namespace); } catch(e) { log("readKV error", fullPath, e.message); }
      const keyMatches = [], valueMatches = [];
      traverseForMatches(data, term, opts, maxDepth, keyMatches, valueMatches);
      if (keyMatches.length || valueMatches.length) {
        const rec = {
          mount, path, fullPath, kv2,
          vaultUrl: `${base}/ui/vault/secrets/${mount.replace(/\/$/, '')}/kv/${encodeURIComponent(path)}`,
          pathMatches: [`Full path: ${fullPath}`],
          keyMatches, valueMatches,
          allData: showAll ? flattenAll(data) : undefined
        };
        results.push(rec);
        onYield && onYield({ type: "deep", ...rec });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(workers, 64) }, () => readWorker()));
  return results;
}

function flattenAll(data, prefix = '') {
  const items = [];
  const recur = (val, pth) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      for (const [k, v] of Object.entries(val)) recur(v, pth ? `${pth}.${k}` : k);
    } else if (Array.isArray(val)) {
      val.forEach((v, i) => recur(v, `${pth}[${i}]`));
    } else {
      items.push({ path: pth, value: val });
    }
  };
  recur(data, prefix);
  return items;
}

// UI
(function init() {
  if (window.__vaultSearchInjected) return;
  window.__vaultSearchInjected = true;

  const fab = document.createElement('button');
  fab.id = 'vault-search-fab';
  fab.textContent = 'Search Vault';
  document.body.appendChild(fab);

  const modal = document.createElement('div');
  modal.id = 'vault-search-modal';
  modal.innerHTML = `
    <div id="vault-search-panel">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
        <h2 style="margin:0;font-size:18px;">Universal Search</h2>
        <button class="btn" id="v-close">Close</button>
      </div>
      <div class="row">
        <div class="col">
          <input class="v-input" id="v-term" placeholder="Search term (path, key name, or value)" />
        </div>
        <div class="col">
          <select class="v-input" id="v-mode">
            <option value="contains">contains</option>
            <option value="exact">exact</option>
            <option value="regex">regex</option>
            <option value="fuzzy">fuzzy</option>
          </select>
        </div>
        <div class="col">
          <label class="small"><input type="checkbox" id="v-ci" checked> case-insensitive</label>
        </div>
      </div>
      <div class="row">
        <div class="col"><label class="small">Max depth <input class="v-input" id="v-depth" type="number" min="1" max="50" value="10" /></label></div>
        <div class="col"><label class="small">Workers <input class="v-input" id="v-workers" type="number" min="8" max="64" value="48" /></label></div>
        <div class="col"><label class="small">Mount filter <input class="v-input" id="v-mount" placeholder="e.g., secret/ or team-kv/"/></label></div>
      </div>
      <div class="row">
        <div class="col"><label class="small">Prefix filter <input class="v-input" id="v-prefix" placeholder="e.g., apps/ or prod/"/></label></div>
        <div class="col"><span class="small">Phase A: path-only (instant). Phase B: deep scan on candidates.</span></div>
      </div>
      <div class="row">
        <button class="btn" id="v-cancel">Cancel</button>
        <button class="btn primary" id="v-run">Search</button>
        <div class="small" id="v-status" style="margin-left:auto;">Idle</div>
      </div>
      <div id="vault-search-errors"></div>
      <div id="vault-search-results" style="margin-top:10px;"></div>
    </div>`;
  document.body.appendChild(modal);

  function openModal(){ modal.style.display = 'block'; }
  function closeModal(){ modal.style.display = 'none'; }
  fab.addEventListener('click', openModal);
  modal.querySelector('#v-close').addEventListener('click', closeModal);
  modal.querySelector('#v-cancel').addEventListener('click', closeModal);

  function showError(msg){
    const box = modal.querySelector('#vault-search-errors');
    box.innerHTML = `<div class="error">${msg}</div>`;
  }

  function renderPathCandidate({ fullPath, mount, kv2 }) {
    const el = document.createElement('div');
    el.className = 'result';

    // Get the current base URL (either from extension settings or page location)
    const base = getVaultAddrFromLocation();
    const path = fullPath.replace(mount, '');
    const vaultUrl = `${base}/ui/vault/secrets/${mount.replace(/\/$/, '')}/kv/${encodeURIComponent(path)}`;

    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
        <div><strong>${fullPath}</strong> <span class="kv-pill">${kv2 ? 'kv2' : 'kv1'}</span></div>
        <div style="display:flex;gap:8px;align-items:center;">
          <span class="small">path match</span>
          <a class="btn" href="${vaultUrl}" target="_blank" rel="noopener noreferrer">Open in UI</a>
        </div>
      </div>`;
    return el;
  }

  function renderDeepResult(m) {
    const el = document.createElement('div');
    el.className = 'result';
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
        <div><strong>${m.fullPath}</strong> <span class="kv-pill">${m.kv2 ? 'kv2' : 'kv1'}</span></div>
        <a class="btn" href="${m.vaultUrl}" target="_blank" rel="noopener noreferrer">Open in UI</a>
      </div>
      ${m.keyMatches?.length ? `<div style="margin-top:6px"><em>Key name matches:</em> ${m.keyMatches.map(({jsonPath})=>`<code>${jsonPath}</code>`).join(' ')}</div>` : ''}
      ${m.valueMatches?.length ? `<div style="margin-top:6px"><em>Value matches:</em> ${m.valueMatches.slice(0,5).map(({jsonPath,value})=>`<code>${jsonPath}</code>: <code>${String(value).slice(0,80)}</code>`).join('<br/>')}${m.valueMatches.length>5?`<div class="small">+${m.valueMatches.length-5} more…</div>`:''}</div>` : ''}
    `;
    return el;
  }

  async function run() {
    const term = modal.querySelector('#v-term').value.trim();
    const mode = modal.querySelector('#v-mode').value;
    const ci = modal.querySelector('#v-ci').checked;
    const depth = parseInt(modal.querySelector('#v-depth').value || '10', 10);
    const workers = parseInt(modal.querySelector('#v-workers').value || '48', 10);
    const mountFilter = modal.querySelector('#v-mount').value.trim();
    const prefixFilter = modal.querySelector('#v-prefix').value.trim();
    const status = modal.querySelector('#v-status');
    const resultsBox = modal.querySelector('#vault-search-results');
    const err = modal.querySelector('#vault-search-errors');
    resultsBox.innerHTML = ''; err.innerHTML = '';

    if (!term) { resultsBox.innerHTML = '<div class="small">Enter a term to search.</div>'; return; }

    status.textContent = 'Getting token, URL, namespace...';
    let base, token, namespace, authData;
    try {
      authData = await getTokenFromPage();

      // Handle both old format (string) and new format (object)
      if (typeof authData === 'string') {
        token = authData;
        base = getVaultAddrFromLocation();
        namespace = getNamespaceFromStorage();
      } else {
        token = authData.token;
        base = authData.vaultUrl || getVaultAddrFromLocation();
        namespace = authData.namespace || getNamespaceFromStorage();
      }
    } catch (e) {
      status.textContent = 'Idle';
      showError(e.message);
      return;
    }

    status.textContent = 'Phase A: scanning paths fast...';
    const controller = new AbortController();

    let totalDeep = 0;
    const frag = document.createDocumentFragment();
    const onYield = (rec) => {
      if (rec.type === "path") {
        frag.appendChild(renderPathCandidate(rec));
        if (frag.childNodes.length >= 10) { resultsBox.appendChild(frag.cloneNode(true)); frag.textContent = ""; }
      }
      if (rec.type === "deep") {
        totalDeep++;
        resultsBox.appendChild(renderDeepResult(rec));
        status.textContent = `Phase B: deep matches so far ${totalDeep}`;
      }
    };

    try {
      const deepMatches = await universalSearch({
        base, token, term, match: mode, similarity: 0.8, caseInsensitive: ci, maxDepth: depth,
        showAll: false, signal: controller.signal, namespace, workers, mountFilter, prefixFilter, onYield
      });
      if (frag.childNodes.length) resultsBox.appendChild(frag);
      status.textContent = `Done. Deep matches: ${deepMatches.length}`;
      if (!deepMatches.length) {
        const note = document.createElement('div');
        note.className = 'small';
        note.textContent = 'No deep (key/value) matches. You can still click the path results above to open secrets and eyeball.';
        resultsBox.appendChild(note);
      }
    } catch (e) {
      status.textContent = 'Idle';
      showError(`Error: ${e.message}`);
      log("Search failed:", e);
    }
  }

  modal.querySelector('#v-run').addEventListener('click', run);

  // Add keyboard shortcut info
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'K') {
      e.preventDefault();
      openModal();
    }
  });

  log("Injected v2.0.0 by Sandesh Sachdev. Button is top-right. Press Ctrl/Cmd+Shift+K to open. Path-first scan streams results immediately; deep scan follows.");
})();
