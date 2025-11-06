/**
 * Vault Search Extension - Popup UI Controller
 * Author: Sandesh Sachdev
 * Version: 2.0.0
 */

// DOM Elements
const vaultUrlInput = document.getElementById('vaultUrl');
const namespaceInput = document.getElementById('namespace');
const tokenInput = document.getElementById('token');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const userpassMountInput = document.getElementById('userpassMount');
const ldapUsernameInput = document.getElementById('ldapUsername');
const ldapPasswordInput = document.getElementById('ldapPassword');
const ldapMountInput = document.getElementById('ldapMount');
const rememberMeCheckbox = document.getElementById('rememberMe');
const saveBtn = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearBtn');
const statusMsg = document.getElementById('statusMsg');
const connectionDot = document.getElementById('connectionDot');
const connectionText = document.getElementById('connectionText');

// Search elements
const searchTermInput = document.getElementById('searchTerm');
const searchModeSelect = document.getElementById('searchMode');
const caseInsensitiveCheckbox = document.getElementById('caseInsensitive');
const searchBtn = document.getElementById('searchBtn');
const searchStatus = document.getElementById('searchStatus');
const searchResults = document.getElementById('searchResults');
const searchConnectionDot = document.getElementById('searchConnectionDot');
const searchConnectionText = document.getElementById('searchConnectionText');

let currentAuthType = 'token';

// Save form state before popup closes
window.addEventListener('beforeunload', () => {
  saveFormState();
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  restoreFormState(); // Restore any unsaved form data
  setupEventListeners();
  checkConnectionStatus();
});

// Setup event listeners
function setupEventListeners() {
  // Main tab switching
  document.querySelectorAll('.main-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchMainTab(tab.dataset.maintab);
    });
  });

  // Auth tab switching
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchAuthTab(tab.dataset.tab);
    });
  });

  // Save button
  saveBtn.addEventListener('click', handleSave);

  // Clear button
  clearBtn.addEventListener('click', handleClear);

  // Search button
  searchBtn.addEventListener('click', handleSearch);

  // Enter key to save/search
  document.querySelectorAll('input').forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        if (input.closest('#search-content')) {
          handleSearch();
        } else {
          handleSave();
        }
      }
    });

    // Auto-save form state on input change
    input.addEventListener('input', () => {
      saveFormState();
    });
  });

  // Save state when auth type changes
  document.querySelectorAll('.auth-tab').forEach(tab => {
    const originalClickHandler = tab.onclick;
    tab.addEventListener('click', () => {
      saveFormState();
    });
  });
}

// Switch main tab
function switchMainTab(tabName) {
  // Update tabs
  document.querySelectorAll('.main-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.maintab === tabName);
  });

  // Update content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}-content`);
  });

  // Update connection status on search tab
  if (tabName === 'search') {
    checkConnectionStatus();
  }
}

// Switch authentication tab
function switchAuthTab(tabName) {
  currentAuthType = tabName;

  // Update tabs
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });

  // Update panels
  document.querySelectorAll('.auth-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `${tabName}-panel`);
  });
}

// Load saved settings
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get([
      'vaultUrl',
      'namespace',
      'authType',
      'token',
      'username',
      'userpassMount',
      'ldapMount',
      'rememberMe'
    ]);

    if (result.vaultUrl) {
      vaultUrlInput.value = result.vaultUrl;
    }

    if (result.namespace) {
      namespaceInput.value = result.namespace;
    }

    if (result.authType) {
      switchAuthTab(result.authType);
    }

    if (result.rememberMe !== undefined) {
      rememberMeCheckbox.checked = result.rememberMe;
    }

    // Only load credentials if remember me was checked
    if (result.rememberMe) {
      if (result.token) {
        tokenInput.value = result.token;
      }

      if (result.username) {
        usernameInput.value = result.username;
        ldapUsernameInput.value = result.username;
      }

      if (result.userpassMount) {
        userpassMountInput.value = result.userpassMount;
      }

      if (result.ldapMount) {
        ldapMountInput.value = result.ldapMount;
      }
    }

  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Error loading settings', 'error');
  }
}

// Handle save
async function handleSave() {
  const vaultUrl = vaultUrlInput.value.trim();
  const namespace = namespaceInput.value.trim();
  const rememberMe = rememberMeCheckbox.checked;

  // Validation
  if (!vaultUrl) {
    showStatus('Please enter a Vault URL', 'error');
    return;
  }

  if (!vaultUrl.startsWith('http://') && !vaultUrl.startsWith('https://')) {
    showStatus('Vault URL must start with http:// or https://', 'error');
    return;
  }

  // Validate auth fields based on current tab
  let authData = {};

  if (currentAuthType === 'token') {
    const token = tokenInput.value.trim();
    if (!token) {
      showStatus('Please enter a Vault token', 'error');
      return;
    }
    authData = { token };
  } else if (currentAuthType === 'userpass') {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    const mount = userpassMountInput.value.trim() || 'userpass';

    if (!username || !password) {
      showStatus('Please enter username and password', 'error');
      return;
    }
    authData = { username, password, userpassMount: mount };
  } else if (currentAuthType === 'ldap') {
    const username = ldapUsernameInput.value.trim();
    const password = ldapPasswordInput.value.trim();
    const mount = ldapMountInput.value.trim() || 'ldap';

    if (!username || !password) {
      showStatus('Please enter LDAP username and password', 'error');
      return;
    }
    authData = { username, password, ldapMount: mount };
  }

  saveBtn.disabled = true;
  saveBtn.textContent = 'Connecting...';

  try {
    // Attempt to authenticate
    const authResult = await authenticateVault(vaultUrl, namespace, currentAuthType, authData);

    if (!authResult.success) {
      throw new Error(authResult.error || 'Authentication failed');
    }

    // Save settings
    const settingsToSave = {
      vaultUrl,
      namespace,
      authType: currentAuthType,
      rememberMe,
      lastConnected: new Date().toISOString()
    };

    // Only save credentials if remember me is checked
    if (rememberMe) {
      if (currentAuthType === 'token') {
        settingsToSave.token = authData.token;
      } else if (currentAuthType === 'userpass') {
        settingsToSave.username = authData.username;
        settingsToSave.userpassMount = authData.userpassMount;
        // Note: We don't save passwords for security reasons
      } else if (currentAuthType === 'ldap') {
        settingsToSave.username = authData.username;
        settingsToSave.ldapMount = authData.ldapMount;
        // Note: We don't save passwords for security reasons
      }
    }

    await chrome.storage.sync.set(settingsToSave);

    // Store the auth token in session storage via background script
    await chrome.runtime.sendMessage({
      type: 'STORE_AUTH',
      data: {
        vaultUrl,
        namespace,
        token: authResult.token,
        authType: currentAuthType
      }
    });

    showStatus('✓ Successfully connected to Vault!', 'success');
    updateConnectionStatus(true);

    // Clear the saved form state since we successfully connected
    clearFormState();

    // Don't auto-close - let user close manually

  } catch (error) {
    console.error('Save error:', error);
    showStatus(`Error: ${error.message}`, 'error');
    updateConnectionStatus(false);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save & Connect';
  }
}

// Authenticate with Vault
async function authenticateVault(vaultUrl, namespace, authType, authData) {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (namespace) {
    headers['X-Vault-Namespace'] = namespace;
  }

  try {
    if (authType === 'token') {
      // Verify token by making a lookup-self request
      const response = await fetch(`${vaultUrl}/v1/auth/token/lookup-self`, {
        method: 'GET',
        headers: {
          ...headers,
          'X-Vault-Token': authData.token
        }
      });

      if (!response.ok) {
        throw new Error(`Token verification failed: ${response.status} ${response.statusText}`);
      }

      return { success: true, token: authData.token };

    } else if (authType === 'userpass') {
      // Login with userpass
      const response = await fetch(`${vaultUrl}/v1/auth/${authData.userpassMount}/login/${authData.username}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ password: authData.password })
      });

      if (!response.ok) {
        throw new Error(`Login failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, token: data.auth.client_token };

    } else if (authType === 'ldap') {
      // Login with LDAP
      const response = await fetch(`${vaultUrl}/v1/auth/${authData.ldapMount}/login/${authData.username}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ password: authData.password })
      });

      if (!response.ok) {
        throw new Error(`LDAP login failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, token: data.auth.client_token };
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return { success: false, error: error.message };
  }
}

// Handle clear
async function handleClear() {
  if (confirm('Are you sure you want to clear all saved settings?')) {
    await chrome.storage.sync.clear();
    await chrome.runtime.sendMessage({ type: 'CLEAR_AUTH' });

    // Clear form
    vaultUrlInput.value = '';
    namespaceInput.value = '';
    tokenInput.value = '';
    usernameInput.value = '';
    passwordInput.value = '';
    ldapUsernameInput.value = '';
    ldapPasswordInput.value = '';
    userpassMountInput.value = 'userpass';
    ldapMountInput.value = 'ldap';
    rememberMeCheckbox.checked = true;

    showStatus('Settings cleared', 'info');
    updateConnectionStatus(false);
  }
}

// Show status message
function showStatus(message, type) {
  statusMsg.textContent = message;
  statusMsg.className = `status ${type}`;
  statusMsg.style.display = 'block';

  // Auto-hide after 5 seconds for non-error messages
  if (type !== 'error') {
    setTimeout(() => {
      statusMsg.style.display = 'none';
    }, 5000);
  }
}

// Update connection status indicator
function updateConnectionStatus(connected) {
  if (connected) {
    connectionDot.classList.add('connected');
    connectionText.textContent = 'Connected to Vault';
    searchConnectionDot.classList.add('connected');
    searchConnectionText.textContent = 'Connected to Vault';
    searchBtn.disabled = false;
  } else {
    connectionDot.classList.remove('connected');
    connectionText.textContent = 'Not connected';
    searchConnectionDot.classList.remove('connected');
    searchConnectionText.textContent = 'Not connected - Configure in Settings';
    searchBtn.disabled = true;
  }
}

// Check if already connected
async function checkConnectionStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'CHECK_AUTH' });
    updateConnectionStatus(response && response.authenticated);
  } catch (error) {
    console.error('Error checking connection:', error);
    updateConnectionStatus(false);
  }
}

// Save current form state to session storage
function saveFormState() {
  const formState = {
    vaultUrl: vaultUrlInput.value,
    namespace: namespaceInput.value,
    authType: currentAuthType,
    token: tokenInput.value,
    username: usernameInput.value,
    password: passwordInput.value,
    userpassMount: userpassMountInput.value,
    ldapUsername: ldapUsernameInput.value,
    ldapPassword: ldapPasswordInput.value,
    ldapMount: ldapMountInput.value,
    rememberMe: rememberMeCheckbox.checked,
    timestamp: Date.now()
  };

  sessionStorage.setItem('vaultPopupFormState', JSON.stringify(formState));
}

// Restore form state from session storage
function restoreFormState() {
  try {
    const savedState = sessionStorage.getItem('vaultPopupFormState');
    if (!savedState) return;

    const formState = JSON.parse(savedState);

    // Only restore if saved within the last 5 minutes
    const fiveMinutes = 5 * 60 * 1000;
    if (Date.now() - formState.timestamp > fiveMinutes) {
      sessionStorage.removeItem('vaultPopupFormState');
      return;
    }

    // Restore form values (only if current values are empty)
    if (!vaultUrlInput.value && formState.vaultUrl) {
      vaultUrlInput.value = formState.vaultUrl;
    }
    if (!namespaceInput.value && formState.namespace) {
      namespaceInput.value = formState.namespace;
    }
    if (!tokenInput.value && formState.token) {
      tokenInput.value = formState.token;
    }
    if (!usernameInput.value && formState.username) {
      usernameInput.value = formState.username;
    }
    if (!passwordInput.value && formState.password) {
      passwordInput.value = formState.password;
    }
    if (!userpassMountInput.value && formState.userpassMount) {
      userpassMountInput.value = formState.userpassMount;
    }
    if (!ldapUsernameInput.value && formState.ldapUsername) {
      ldapUsernameInput.value = formState.ldapUsername;
    }
    if (!ldapPasswordInput.value && formState.ldapPassword) {
      ldapPasswordInput.value = formState.ldapPassword;
    }
    if (!ldapMountInput.value && formState.ldapMount) {
      ldapMountInput.value = formState.ldapMount;
    }

    // Restore auth type
    if (formState.authType) {
      switchAuthTab(formState.authType);
    }

  } catch (error) {
    console.error('Error restoring form state:', error);
  }
}

// Handle search button click
async function handleSearch() {
  const term = searchTermInput.value.trim();

  if (!term) {
    showSearchStatus('Please enter a search term', 'error');
    return;
  }

  searchBtn.disabled = true;
  searchBtn.innerHTML = '🔄 Searching...';
  searchResults.innerHTML = '';
  showSearchStatus('<span class="spinner-inline"></span> Searching...', 'info');

  try {
    // Get auth from background
    const authResponse = await chrome.runtime.sendMessage({ type: 'GET_AUTH' });

    if (!authResponse || !authResponse.authenticated) {
      showSearchStatus('Not authenticated. Please configure in Settings tab.', 'error');
      searchBtn.disabled = false;
      searchBtn.innerHTML = '🔍 Search Vault';
      return;
    }

    const { vaultUrl, token, namespace } = authResponse;
    const mode = searchModeSelect.value;
    const caseInsensitive = caseInsensitiveCheckbox.checked;

    // Perform search using the search logic
    const results = await performVaultSearch(vaultUrl, token, namespace, term, mode, caseInsensitive);

    displaySearchResults(results);
    showSearchStatus(`Found ${results.length} result(s)`, 'success');

  } catch (error) {
    console.error('Search error:', error);
    showSearchStatus(`Error: ${error.message}`, 'error');
  } finally {
    searchBtn.disabled = false;
    searchBtn.innerHTML = '🔍 Search Vault';
  }
}

// Perform vault search
async function performVaultSearch(vaultUrl, token, namespace, term, mode, caseInsensitive) {
  const results = [];

  // List all mounts
  const mountsUrl = `${vaultUrl}/v1/sys/mounts`;
  const headers = {
    'X-Vault-Token': token,
  };
  if (namespace) {
    headers['X-Vault-Namespace'] = namespace;
  }

  const mountsResponse = await fetch(mountsUrl, { headers });
  if (!mountsResponse.ok) {
    throw new Error(`Failed to list mounts: ${mountsResponse.statusText}`);
  }

  const mountsData = await mountsResponse.json();
  const kvMounts = Object.entries(mountsData.data || {}).filter(([_, v]) =>
    v.type === 'kv' || v.type === 'generic'
  );

  // Search through mounts (limit to first 100 paths for popup performance)
  let pathsChecked = 0;
  const maxPaths = 100;

  for (const [mount] of kvMounts) {
    if (pathsChecked >= maxPaths) break;

    try {
      const paths = await listPathsRecursive(vaultUrl, token, namespace, mount, '', 3); // Limit depth to 3

      for (const path of paths) {
        if (pathsChecked >= maxPaths) break;
        pathsChecked++;

        const fullPath = `${mount}${path}`;

        // Check if path matches search term
        if (matchesSearch(fullPath, term, mode, caseInsensitive)) {
          results.push({
            path: fullPath,
            mount: mount,
            type: 'path',
            url: `${vaultUrl}/ui/vault/secrets/${mount}/show/${path}`
          });
        }

        // Also try to read the secret and search in keys/values (but limit this)
        if (results.length < 20) {
          try {
            const secret = await readSecret(vaultUrl, token, namespace, mount, path);
            if (secret && searchInSecret(secret, term, mode, caseInsensitive)) {
              if (!results.find(r => r.path === fullPath)) {
                results.push({
                  path: fullPath,
                  mount: mount,
                  type: 'content',
                  url: `${vaultUrl}/ui/vault/secrets/${mount}/show/${path}`,
                  matches: extractMatches(secret, term, mode, caseInsensitive)
                });
              }
            }
          } catch (e) {
            // Skip secrets we can't read
          }
        }
      }
    } catch (e) {
      console.error(`Error searching mount ${mount}:`, e);
    }
  }

  return results;
}

// Helper: List paths recursively
async function listPathsRecursive(vaultUrl, token, namespace, mount, path, maxDepth, currentDepth = 0) {
  if (currentDepth >= maxDepth) return [];

  const paths = [];
  const listUrl = `${vaultUrl}/v1/${mount}metadata/${path}?list=true`;
  const headers = {
    'X-Vault-Token': token,
  };
  if (namespace) {
    headers['X-Vault-Namespace'] = namespace;
  }

  try {
    const response = await fetch(listUrl, { headers });
    if (!response.ok) return [];

    const data = await response.json();
    const keys = data.data?.keys || [];

    for (const key of keys) {
      const fullPath = path + key;
      if (key.endsWith('/')) {
        // Directory
        const subPaths = await listPathsRecursive(vaultUrl, token, namespace, mount, fullPath, maxDepth, currentDepth + 1);
        paths.push(...subPaths);
      } else {
        // File
        paths.push(fullPath);
      }
    }
  } catch (e) {
    // Skip paths we can't list
  }

  return paths;
}

// Helper: Read secret
async function readSecret(vaultUrl, token, namespace, mount, path) {
  const readUrl = `${vaultUrl}/v1/${mount}data/${path}`;
  const headers = {
    'X-Vault-Token': token,
  };
  if (namespace) {
    headers['X-Vault-Namespace'] = namespace;
  }

  const response = await fetch(readUrl, { headers });
  if (!response.ok) return null;

  const data = await response.json();
  return data.data?.data;
}

// Helper: Check if text matches search
function matchesSearch(text, term, mode, caseInsensitive) {
  const t = caseInsensitive ? text.toLowerCase() : text;
  const s = caseInsensitive ? term.toLowerCase() : term;

  if (mode === 'exact') {
    return t === s;
  } else if (mode === 'substring') {
    return t.includes(s);
  } else {
    // Fuzzy
    return t.includes(s) || levenshteinDistance(t, s) < 5;
  }
}

// Helper: Search in secret data
function searchInSecret(data, term, mode, caseInsensitive) {
  const searchStr = JSON.stringify(data);
  return matchesSearch(searchStr, term, mode, caseInsensitive);
}

// Helper: Extract matches from secret
function extractMatches(data, term, mode, caseInsensitive) {
  const matches = [];
  for (const [key, value] of Object.entries(data)) {
    if (matchesSearch(key, term, mode, caseInsensitive) ||
        matchesSearch(String(value), term, mode, caseInsensitive)) {
      matches.push(`${key}: ${String(value).substring(0, 50)}`);
    }
  }
  return matches.slice(0, 3);
}

// Helper: Levenshtein distance for fuzzy matching
function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Display search results
function displaySearchResults(results) {
  searchResults.innerHTML = '';

  if (results.length === 0) {
    searchResults.innerHTML = '<div class="result-item"><div class="detail">No results found</div></div>';
    return;
  }

  for (const result of results) {
    const div = document.createElement('div');
    div.className = 'result-item';
    div.innerHTML = `
      <div class="path">${result.path}</div>
      <div class="detail">${result.type === 'path' ? 'Path match' : 'Content match'}</div>
      ${result.matches ? `<div class="detail" style="margin-top: 4px;">${result.matches.join(', ')}</div>` : ''}
    `;
    div.addEventListener('click', () => {
      chrome.tabs.create({ url: result.url });
    });
    searchResults.appendChild(div);
  }
}

// Show search status
function showSearchStatus(message, type) {
  searchStatus.innerHTML = message;
  searchStatus.className = `search-status ${type}`;

  if (type !== 'error') {
    setTimeout(() => {
      searchStatus.innerHTML = '';
    }, 5000);
  }
}

// Clear saved form state on successful save
function clearFormState() {
  sessionStorage.removeItem('vaultPopupFormState');
}
