/**
 * Vault Search Extension - Popup UI Controller
 * Author: Sandesh Sachdev
 * Version: 2.3.0
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
const caseInsensitiveCheckbox = document.getElementById('caseInsensitive');
const exactMatchCheckbox = document.getElementById('exactMatch');
const searchBtn = document.getElementById('searchBtn');
const cancelBtn = document.getElementById('cancelBtn');
const searchStatus = document.getElementById('searchStatus');
const searchResults = document.getElementById('searchResults');
const searchConnectionDot = document.getElementById('searchConnectionDot');
const searchConnectionText = document.getElementById('searchConnectionText');

let currentAuthType = 'token';
let currentSearchId = null;
let searchPollingInterval = null;

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
  checkForActiveSearch(); // Check if there's an ongoing search
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

  // Cancel button
  cancelBtn.addEventListener('click', handleCancelSearch);

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

// Check for active search when popup opens
async function checkForActiveSearch() {
  try {
    const activeSearchId = sessionStorage.getItem('activeSearchId');
    const activeSearchTerm = sessionStorage.getItem('activeSearchTerm');

    if (activeSearchId) {
      console.log('[Popup] Resuming active search:', activeSearchId);

      // Check if search still exists
      const response = await chrome.runtime.sendMessage({
        type: 'GET_SEARCH_RESULTS',
        searchId: activeSearchId
      });

      if (response && response.status !== 'not_found') {
        // Resume this search
        currentSearchId = activeSearchId;

        // Update UI
        if (activeSearchTerm) {
          searchTermInput.value = activeSearchTerm;
        }

        if (response.status === 'running') {
          searchBtn.disabled = true;
          searchBtn.innerHTML = '⏸️ Searching...';
          showSearchStatus(
            `<span class="spinner-inline"></span> Resuming search for "${activeSearchTerm}"...`,
            'info'
          );

          // Display current results
          displaySearchResults(response.results || []);

          // Start polling
          searchPollingInterval = setInterval(async () => {
            await pollSearchResults();
          }, 1000);

          // Immediate poll
          await pollSearchResults();
        } else if (response.status === 'completed') {
          // Show completed results
          displaySearchResults(response.results || []);
          showSearchStatus(`✅ Search complete! Found ${response.results.length} result(s)`, 'success');
          sessionStorage.removeItem('activeSearchId');
          sessionStorage.removeItem('activeSearchTerm');
        } else if (response.status === 'error') {
          showSearchStatus(`Previous search failed: ${response.error}`, 'error');
          sessionStorage.removeItem('activeSearchId');
          sessionStorage.removeItem('activeSearchTerm');
        }
      } else {
        // Search expired
        sessionStorage.removeItem('activeSearchId');
        sessionStorage.removeItem('activeSearchTerm');
      }
    }
  } catch (error) {
    console.error('Error checking for active search:', error);
    sessionStorage.removeItem('activeSearchId');
    sessionStorage.removeItem('activeSearchTerm');
  }
}

// Handle search button click
async function handleSearch() {
  const term = searchTermInput.value.trim();

  if (!term) {
    showSearchStatus('Please enter a search term', 'error');
    return;
  }

  // Clear previous search polling and state
  if (searchPollingInterval) {
    clearInterval(searchPollingInterval);
    searchPollingInterval = null;
  }

  // Clear old search ID
  if (currentSearchId) {
    sessionStorage.removeItem('activeSearchId');
    sessionStorage.removeItem('activeSearchTerm');
    currentSearchId = null;
  }

  // Lock UI during search
  lockUI(true);

  searchBtn.disabled = true;
  searchBtn.innerHTML = '🔄 Starting search...';
  cancelBtn.style.display = 'block';
  searchResults.innerHTML = '';
  showSearchStatus('<span class="spinner-inline"></span> Starting background search...', 'info');

  try {
    // Get auth from background
    const authResponse = await chrome.runtime.sendMessage({ type: 'GET_AUTH' });

    if (!authResponse || !authResponse.authenticated) {
      showSearchStatus('Not authenticated. Please configure in Settings tab.', 'error');
      lockUI(false);
      searchBtn.disabled = false;
      searchBtn.innerHTML = '🔍 Search Vault';
      cancelBtn.style.display = 'none';
      return;
    }

    const { vaultUrl, token, namespace } = authResponse;

    // Get search options
    const options = {
      exactMatch: exactMatchCheckbox.checked,
      caseInsensitive: caseInsensitiveCheckbox.checked
    };

    // Start search in background
    const searchResponse = await chrome.runtime.sendMessage({
      type: 'START_SEARCH',
      data: { term, vaultUrl, token, namespace, options }
    });

    if (searchResponse.success) {
      currentSearchId = searchResponse.searchId;

      // Save search state to sessionStorage so we can resume if popup reopens
      sessionStorage.setItem('activeSearchId', currentSearchId);
      sessionStorage.setItem('activeSearchTerm', term);

      showSearchStatus('<span class="spinner-inline"></span> Search running in background... (you can close this popup)', 'info');
      searchBtn.innerHTML = '⏸️ Searching...';

      // Poll for results
      searchPollingInterval = setInterval(async () => {
        await pollSearchResults();
      }, 1000); // Check every second

      // Initial poll
      await pollSearchResults();
    } else {
      throw new Error('Failed to start search');
    }

  } catch (error) {
    console.error('Search error:', error);
    showSearchStatus(`Error: ${error.message}`, 'error');
    lockUI(false);
    searchBtn.disabled = false;
    searchBtn.innerHTML = '🔍 Search Vault';
    cancelBtn.style.display = 'none';
  }
}

// Handle cancel search
function handleCancelSearch() {
  // Stop polling
  if (searchPollingInterval) {
    clearInterval(searchPollingInterval);
    searchPollingInterval = null;
  }

  // Clear search state
  if (currentSearchId) {
    sessionStorage.removeItem('activeSearchId');
    sessionStorage.removeItem('activeSearchTerm');
    currentSearchId = null;
  }

  // Unlock UI
  lockUI(false);

  // Reset buttons
  searchBtn.disabled = false;
  searchBtn.innerHTML = '🔍 Search Vault';
  cancelBtn.style.display = 'none';

  // Show cancelled message
  showSearchStatus('Search cancelled', 'info');
}

// Lock/unlock UI during search
function lockUI(lock) {
  const elementsToLock = [
    searchTermInput,
    caseInsensitiveCheckbox,
    exactMatchCheckbox,
    ...document.querySelectorAll('.main-tab'),
    ...document.querySelectorAll('.auth-tab'),
    vaultUrlInput,
    namespaceInput,
    tokenInput,
    usernameInput,
    passwordInput,
    userpassMountInput,
    ldapUsernameInput,
    ldapPasswordInput,
    ldapMountInput,
    saveBtn,
    clearBtn
  ];

  elementsToLock.forEach(el => {
    if (el) {
      if (lock) {
        el.disabled = true;
        el.style.opacity = '0.5';
        el.style.pointerEvents = 'none';
      } else {
        el.disabled = false;
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
      }
    }
  });
}

// Poll for search results from background
async function pollSearchResults() {
  if (!currentSearchId) return;

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_SEARCH_RESULTS',
      searchId: currentSearchId
    });

    if (response.status === 'not_found') {
      // Search expired or doesn't exist
      if (searchPollingInterval) {
        clearInterval(searchPollingInterval);
        searchPollingInterval = null;
      }
      sessionStorage.removeItem('activeSearchId');
      sessionStorage.removeItem('activeSearchTerm');
      currentSearchId = null;
      showSearchStatus('Search expired. Please try again.', 'error');
      searchBtn.disabled = false;
      searchBtn.innerHTML = '🔍 Search Vault';
      return;
    }

    // Update results display
    displaySearchResults(response.results || []);

    if (response.status === 'completed') {
      // Search complete
      if (searchPollingInterval) {
        clearInterval(searchPollingInterval);
        searchPollingInterval = null;
      }
      sessionStorage.removeItem('activeSearchId');
      sessionStorage.removeItem('activeSearchTerm');
      showSearchStatus(`✅ Search complete! Found ${response.results.length} result(s)`, 'success');
      searchBtn.disabled = false;
      searchBtn.innerHTML = '🔍 Search Vault';
      cancelBtn.style.display = 'none';
      lockUI(false); // Unlock UI
    } else if (response.status === 'error') {
      // Search error
      if (searchPollingInterval) {
        clearInterval(searchPollingInterval);
        searchPollingInterval = null;
      }
      sessionStorage.removeItem('activeSearchId');
      sessionStorage.removeItem('activeSearchTerm');
      showSearchStatus(`Error: ${response.error}`, 'error');
      searchBtn.disabled = false;
      searchBtn.innerHTML = '🔍 Search Vault';
      cancelBtn.style.display = 'none';
      lockUI(false); // Unlock UI
    } else {
      // Still running - update status
      const term = sessionStorage.getItem('activeSearchTerm') || 'search';
      showSearchStatus(
        `<span class="spinner-inline"></span> Found ${response.results.length} result(s) for "${term}"... (continues in background)`,
        'info'
      );
    }
  } catch (error) {
    console.error('Error polling results:', error);
  }
}

// Display search results
function displaySearchResults(results) {
  searchResults.innerHTML = '';

  if (results.length === 0) {
    searchResults.innerHTML = '<div class="result-item"><div class="detail">Searching... Results will appear here</div></div>';
    return;
  }

  // Remove duplicates by path
  const uniqueResults = [];
  const seenPaths = new Set();

  for (const result of results) {
    if (!seenPaths.has(result.path)) {
      seenPaths.add(result.path);
      uniqueResults.push(result);
    }
  }

  for (const result of uniqueResults) {
    const div = document.createElement('div');
    div.className = 'result-item';

    const matchBadge = result.matchType === 'path'
      ? '<span style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin-left: 8px;">PATH</span>'
      : '<span style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin-left: 8px;">CONTENT</span>';

    div.innerHTML = `
      <div class="path">${result.path}${matchBadge}</div>
      ${result.matches ? `<div class="detail" style="margin-top: 4px; font-size: 11px;">${result.matches.join(' • ')}</div>` : ''}
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

  // Don't auto-hide for running searches
  if (type === 'success' || (type === 'error' && !message.includes('Search running'))) {
    setTimeout(() => {
      if (searchStatus.innerHTML === message) { // Only clear if message hasn't changed
        searchStatus.innerHTML = '';
      }
    }, 5000);
  }
}

// Clear saved form state on successful save
function clearFormState() {
  sessionStorage.removeItem('vaultPopupFormState');
}
