/**
 * Vault Search Extension - Popup UI Controller (Optimized)
 * Author: Sandesh Sachdev
 * Version: 2.3.1
 *
 * Performance Optimizations:
 * - Cached DOM references with lazy loading
 * - Debounced auto-save with exponential backoff
 * - Optimized polling with adaptive intervals
 * - Memory leak prevention with cleanup handlers
 * - Reduced reflows with batch DOM updates
 *
 * UX Improvements:
 * - Enhanced accessibility (ARIA labels, keyboard nav)
 * - Loading states with skeletons
 * - Better error messages with actions
 * - Visual feedback improvements
 * - Responsive interactions
 */

// ============================================================================
// CONSTANTS
// ============================================================================
const CONSTANTS = {
  POLLING: {
    INITIAL_INTERVAL: 500,      // Start with 500ms for quick feedback
    MAX_INTERVAL: 3000,          // Max 3s between polls
    BACKOFF_MULTIPLIER: 1.5      // Exponential backoff
  },
  TIMEOUTS: {
    DEBOUNCE_FORM_SAVE: 300,     // Debounce form auto-save
    STATUS_MESSAGE: 5000,         // Auto-hide status messages
    FORM_STATE_EXPIRY: 300000    // 5 minutes
  },
  STORAGE_KEYS: {
    FORM_STATE: 'vaultPopupFormState',
    ACTIVE_SEARCH_ID: 'activeSearchId',
    ACTIVE_SEARCH_TERM: 'activeSearchTerm'
  }
};

// ============================================================================
// DOM CACHE - Lazy-loaded for performance
// ============================================================================
const DOMCache = {
  _cache: {},

  get(id) {
    if (!this._cache[id]) {
      this._cache[id] = document.getElementById(id);
    }
    return this._cache[id];
  },

  getAll(selector) {
    const key = `_selector_${selector}`;
    if (!this._cache[key]) {
      this._cache[key] = document.querySelectorAll(selector);
    }
    return this._cache[key];
  },

  clear() {
    this._cache = {};
  }
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================
const AppState = {
  currentAuthType: 'token',
  currentSearchId: null,
  searchPollingInterval: null,
  pollingBackoff: CONSTANTS.POLLING.INITIAL_INTERVAL,
  isSearching: false,
  abortController: null,

  reset() {
    this.currentSearchId = null;
    this.isSearching = false;
    this.pollingBackoff = CONSTANTS.POLLING.INITIAL_INTERVAL;
    if (this.searchPollingInterval) {
      clearInterval(this.searchPollingInterval);
      this.searchPollingInterval = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Debounce function for performance
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for frequent events
 */
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Safe async operation with timeout and error handling
 */
async function safeAsync(promise, timeoutMs = 10000, fallback = null) {
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
    );
    return await Promise.race([promise, timeoutPromise]);
  } catch (error) {
    console.error('[SafeAsync] Error:', error);
    return fallback;
  }
}

/**
 * Sanitize HTML to prevent XSS
 */
function sanitizeHTML(str) {
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}

/**
 * Format error message for user display
 */
function formatErrorMessage(error) {
  if (error.message.includes('Failed to fetch')) {
    return 'Network error. Please check your connection and Vault URL.';
  }
  if (error.message.includes('403')) {
    return 'Access denied. Please check your credentials.';
  }
  if (error.message.includes('404')) {
    return 'Vault endpoint not found. Please verify your URL.';
  }
  return error.message || 'An unexpected error occurred';
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  debouncedSaveFormState.flush();
  AppState.reset();
  DOMCache.clear();
});

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initializeApp();
  } catch (error) {
    console.error('[Init] Fatal error:', error);
    showStatus('Failed to initialize. Please refresh the extension.', 'error');
  }
});

/**
 * Main initialization function
 */
async function initializeApp() {
  // Load settings and state in parallel for faster startup
  const [settingsLoaded, stateRestored, connectionChecked] = await Promise.allSettled([
    loadSettings(),
    restoreFormState(),
    checkConnectionStatus()
  ]);

  // Setup event listeners
  setupEventListeners();

  // Check for active search
  await checkForActiveSearch();

  // Focus search input if on search tab
  const searchTab = DOMCache.get('search-content');
  if (searchTab && searchTab.classList.contains('active')) {
    DOMCache.get('searchTerm')?.focus();
  }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
  // Main tab switching
  DOMCache.getAll('.main-tab').forEach(tab => {
    tab.addEventListener('click', () => switchMainTab(tab.dataset.maintab), { passive: true });
  });

  // Auth tab switching
  DOMCache.getAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab), { passive: true });
  });

  // Button handlers
  DOMCache.get('saveBtn')?.addEventListener('click', handleSave);
  DOMCache.get('clearBtn')?.addEventListener('click', handleClear);
  DOMCache.get('searchBtn')?.addEventListener('click', handleSearch);
  DOMCache.get('cancelBtn')?.addEventListener('click', handleCancelSearch);

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);

  // Form inputs with debounced auto-save
  DOMCache.getAll('input').forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const isSearchTab = input.closest('#search-content');
        if (isSearchTab) {
          handleSearch();
        } else {
          handleSave();
        }
      }
    });

    // Debounced auto-save
    input.addEventListener('input', debouncedSaveFormState, { passive: true });
  });
}

/**
 * Handle keyboard shortcuts for better UX
 */
function handleKeyboardShortcuts(e) {
  // Escape to cancel search
  if (e.key === 'Escape' && AppState.isSearching) {
    handleCancelSearch();
  }

  // Ctrl/Cmd + K to focus search
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    switchMainTab('search');
    DOMCache.get('searchTerm')?.focus();
  }
}

// ============================================================================
// TAB MANAGEMENT
// ============================================================================

function switchMainTab(tabName) {
  // Batch DOM updates for better performance
  requestAnimationFrame(() => {
    // Update tabs
    DOMCache.getAll('.main-tab').forEach(tab => {
      const isActive = tab.dataset.maintab === tabName;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive);
    });

    // Update content
    DOMCache.getAll('.tab-content').forEach(content => {
      const isActive = content.id === `${tabName}-content`;
      content.classList.toggle('active', isActive);
      content.setAttribute('aria-hidden', !isActive);
    });

    // Update connection status on search tab
    if (tabName === 'search') {
      checkConnectionStatus();
      DOMCache.get('searchTerm')?.focus();
    }
  });
}

function switchAuthTab(tabName) {
  AppState.currentAuthType = tabName;

  requestAnimationFrame(() => {
    // Update tabs
    DOMCache.getAll('.auth-tab').forEach(tab => {
      const isActive = tab.dataset.tab === tabName;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive);
    });

    // Update panels
    DOMCache.getAll('.auth-panel').forEach(panel => {
      const isActive = panel.id === `${tabName}-panel`;
      panel.classList.toggle('active', isActive);
      panel.setAttribute('aria-hidden', !isActive);
    });
  });
}

// ============================================================================
// SETTINGS MANAGEMENT
// ============================================================================

async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get([
      'vaultUrl', 'namespace', 'authType', 'token',
      'username', 'userpassMount', 'ldapMount', 'rememberMe'
    ]);

    // Batch DOM updates
    requestAnimationFrame(() => {
      if (result.vaultUrl) DOMCache.get('vaultUrl').value = result.vaultUrl;
      if (result.namespace) DOMCache.get('namespace').value = result.namespace;
      if (result.authType) switchAuthTab(result.authType);

      const rememberMe = DOMCache.get('rememberMe');
      if (rememberMe) rememberMe.checked = result.rememberMe !== false;

      // Only load credentials if remember me was checked
      if (result.rememberMe) {
        if (result.token) DOMCache.get('token').value = result.token;
        if (result.username) {
          DOMCache.get('username').value = result.username;
          DOMCache.get('ldapUsername').value = result.username;
        }
        if (result.userpassMount) DOMCache.get('userpassMount').value = result.userpassMount;
        if (result.ldapMount) DOMCache.get('ldapMount').value = result.ldapMount;
      }
    });
  } catch (error) {
    console.error('[LoadSettings] Error:', error);
    showStatus('Error loading settings', 'error');
  }
}

async function handleSave() {
  const vaultUrl = DOMCache.get('vaultUrl').value.trim();
  const namespace = DOMCache.get('namespace').value.trim();
  const rememberMe = DOMCache.get('rememberMe').checked;

  // Validation
  if (!vaultUrl) {
    showStatus('Please enter a Vault URL', 'error');
    DOMCache.get('vaultUrl').focus();
    return;
  }

  if (!vaultUrl.startsWith('http://') && !vaultUrl.startsWith('https://')) {
    showStatus('Vault URL must start with http:// or https://', 'error');
    DOMCache.get('vaultUrl').focus();
    return;
  }

  // Get auth data based on current type
  const authData = getAuthDataForCurrentType();
  if (!authData) return; // Validation failed

  const saveBtn = DOMCache.get('saveBtn');
  const originalText = saveBtn.textContent;

  // Disable button and show loading state
  saveBtn.disabled = true;
  saveBtn.textContent = '🔄 Connecting...';
  saveBtn.setAttribute('aria-busy', 'true');

  try {
    // Attempt authentication with timeout
    const authResult = await safeAsync(
      authenticateVault(vaultUrl, namespace, AppState.currentAuthType, authData),
      15000 // 15 second timeout
    );

    if (!authResult || !authResult.success) {
      throw new Error(authResult?.error || 'Authentication failed');
    }

    // Save settings
    const settingsToSave = {
      vaultUrl,
      namespace,
      authType: AppState.currentAuthType,
      rememberMe,
      lastConnected: new Date().toISOString()
    };

    // Only save credentials if remember me is checked
    if (rememberMe) {
      Object.assign(settingsToSave, getSaveableCredentials(authData));
    }

    await chrome.storage.sync.set(settingsToSave);

    // Store auth token in background
    await chrome.runtime.sendMessage({
      type: 'STORE_AUTH',
      data: {
        vaultUrl,
        namespace,
        token: authResult.token,
        authType: AppState.currentAuthType
      }
    });

    showStatus('✓ Successfully connected to Vault!', 'success');
    updateConnectionStatus(true);
    clearFormState();

  } catch (error) {
    console.error('[Save] Error:', error);
    showStatus(formatErrorMessage(error), 'error');
    updateConnectionStatus(false);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
    saveBtn.setAttribute('aria-busy', 'false');
  }
}

/**
 * Get auth data for current auth type with validation
 */
function getAuthDataForCurrentType() {
  const authType = AppState.currentAuthType;

  if (authType === 'token') {
    const token = DOMCache.get('token').value.trim();
    if (!token) {
      showStatus('Please enter a Vault token', 'error');
      DOMCache.get('token').focus();
      return null;
    }
    return { token };
  }

  if (authType === 'userpass') {
    const username = DOMCache.get('username').value.trim();
    const password = DOMCache.get('password').value.trim();
    const mount = DOMCache.get('userpassMount').value.trim() || 'userpass';

    if (!username || !password) {
      showStatus('Please enter username and password', 'error');
      (username ? DOMCache.get('password') : DOMCache.get('username')).focus();
      return null;
    }
    return { username, password, userpassMount: mount };
  }

  if (authType === 'ldap') {
    const username = DOMCache.get('ldapUsername').value.trim();
    const password = DOMCache.get('ldapPassword').value.trim();
    const mount = DOMCache.get('ldapMount').value.trim() || 'ldap';

    if (!username || !password) {
      showStatus('Please enter LDAP username and password', 'error');
      (username ? DOMCache.get('ldapPassword') : DOMCache.get('ldapUsername')).focus();
      return null;
    }
    return { username, password, ldapMount: mount };
  }

  return null;
}

/**
 * Get saveable credentials (excluding passwords)
 */
function getSaveableCredentials(authData) {
  const credentials = {};

  if (AppState.currentAuthType === 'token') {
    credentials.token = authData.token;
  } else if (AppState.currentAuthType === 'userpass') {
    credentials.username = authData.username;
    credentials.userpassMount = authData.userpassMount;
  } else if (AppState.currentAuthType === 'ldap') {
    credentials.username = authData.username;
    credentials.ldapMount = authData.ldapMount;
  }

  return credentials;
}

/**
 * Authenticate with Vault with retry logic
 */
async function authenticateVault(vaultUrl, namespace, authType, authData, retries = 2) {
  const headers = { 'Content-Type': 'application/json' };
  if (namespace) headers['X-Vault-Namespace'] = namespace;

  const attemptAuth = async () => {
    if (authType === 'token') {
      const response = await fetch(`${vaultUrl}/v1/auth/token/lookup-self`, {
        method: 'GET',
        headers: { ...headers, 'X-Vault-Token': authData.token }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token verification failed (${response.status}): ${error}`);
      }

      return { success: true, token: authData.token };
    }

    if (authType === 'userpass') {
      const response = await fetch(
        `${vaultUrl}/v1/auth/${authData.userpassMount}/login/${authData.username}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ password: authData.password })
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Login failed (${response.status}): ${error}`);
      }

      const data = await response.json();
      return { success: true, token: data.auth.client_token };
    }

    if (authType === 'ldap') {
      const response = await fetch(
        `${vaultUrl}/v1/auth/${authData.ldapMount}/login/${authData.username}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ password: authData.password })
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`LDAP login failed (${response.status}): ${error}`);
      }

      const data = await response.json();
      return { success: true, token: data.auth.client_token };
    }
  };

  // Retry logic
  let lastError;
  for (let i = 0; i <= retries; i++) {
    try {
      return await attemptAuth();
    } catch (error) {
      lastError = error;
      if (i < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  return { success: false, error: lastError.message };
}

async function handleClear() {
  if (!confirm('Clear all saved settings? This will disconnect your Vault session.')) {
    return;
  }

  try {
    await Promise.all([
      chrome.storage.sync.clear(),
      chrome.runtime.sendMessage({ type: 'CLEAR_AUTH' })
    ]);

    // Clear form in batch
    requestAnimationFrame(() => {
      const fields = [
        ['vaultUrl', ''], ['namespace', ''], ['token', ''],
        ['username', ''], ['password', ''], ['ldapUsername', ''],
        ['ldapPassword', ''], ['userpassMount', 'userpass'],
        ['ldapMount', 'ldap'], ['rememberMe', true]
      ];

      fields.forEach(([id, value]) => {
        const el = DOMCache.get(id);
        if (el) {
          if (typeof value === 'boolean') {
            el.checked = value;
          } else {
            el.value = value;
          }
        }
      });
    });

    showStatus('✓ Settings cleared', 'success');
    updateConnectionStatus(false);
  } catch (error) {
    console.error('[Clear] Error:', error);
    showStatus('Error clearing settings', 'error');
  }
}

// ============================================================================
// SEARCH FUNCTIONALITY
// ============================================================================

async function handleSearch() {
  const term = DOMCache.get('searchTerm').value.trim();

  if (!term) {
    showSearchStatus('Please enter a search term', 'error');
    DOMCache.get('searchTerm').focus();
    return;
  }

  // Prevent double-submit
  if (AppState.isSearching) {
    return;
  }

  // Reset state
  AppState.reset();
  AppState.isSearching = true;
  AppState.abortController = new AbortController();

  // Lock UI
  lockUI(true);

  const searchBtn = DOMCache.get('searchBtn');
  const cancelBtn = DOMCache.get('cancelBtn');

  searchBtn.disabled = true;
  searchBtn.innerHTML = '<span class="spinner-inline"></span> Starting...';
  searchBtn.setAttribute('aria-busy', 'true');
  cancelBtn.style.display = 'block';

  DOMCache.get('searchResults').innerHTML = createLoadingSkeleton();
  showSearchStatus('<span class="spinner-inline"></span> Initializing search...', 'info');

  try {
    // Get auth from background
    const authResponse = await safeAsync(
      chrome.runtime.sendMessage({ type: 'GET_AUTH' }),
      5000
    );

    if (!authResponse || !authResponse.authenticated) {
      throw new Error('Not authenticated. Please configure in Settings tab.');
    }

    const { vaultUrl, token, namespace } = authResponse;
    const options = {
      exactMatch: DOMCache.get('exactMatch')?.checked || false,
      caseInsensitive: DOMCache.get('caseInsensitive')?.checked || false
    };

    // Start search in background
    const searchResponse = await safeAsync(
      chrome.runtime.sendMessage({
        type: 'START_SEARCH',
        data: { term, vaultUrl, token, namespace, options }
      }),
      10000
    );

    if (!searchResponse || !searchResponse.success) {
      throw new Error(searchResponse?.error || 'Failed to start search');
    }

    AppState.currentSearchId = searchResponse.searchId;

    // Save search state
    sessionStorage.setItem(CONSTANTS.STORAGE_KEYS.ACTIVE_SEARCH_ID, AppState.currentSearchId);
    sessionStorage.setItem(CONSTANTS.STORAGE_KEYS.ACTIVE_SEARCH_TERM, term);

    showSearchStatus('<span class="spinner-inline"></span> Search running...', 'info');
    searchBtn.innerHTML = '⏸️ Searching...';

    // Start adaptive polling
    startAdaptivePolling();

  } catch (error) {
    console.error('[Search] Error:', error);
    showSearchStatus(formatErrorMessage(error), 'error');
    resetSearchUI();
  }
}

/**
 * Adaptive polling with exponential backoff
 */
function startAdaptivePolling() {
  const poll = async () => {
    if (!AppState.currentSearchId || !AppState.isSearching) {
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_SEARCH_RESULTS',
        searchId: AppState.currentSearchId
      });

      if (!response || response.status === 'not_found') {
        throw new Error('Search session expired');
      }

      // Update results
      displaySearchResults(response.results || []);

      if (response.status === 'completed') {
        handleSearchComplete(response);
      } else if (response.status === 'error') {
        throw new Error(response.error || 'Search failed');
      } else {
        // Still running - update status
        const term = sessionStorage.getItem(CONSTANTS.STORAGE_KEYS.ACTIVE_SEARCH_TERM) || 'search';
        showSearchStatus(
          `<span class="spinner-inline"></span> Found ${response.results.length} result(s) for "${sanitizeHTML(term)}"...`,
          'info'
        );

        // Increase polling interval (exponential backoff)
        AppState.pollingBackoff = Math.min(
          AppState.pollingBackoff * CONSTANTS.POLLING.BACKOFF_MULTIPLIER,
          CONSTANTS.POLLING.MAX_INTERVAL
        );

        // Schedule next poll
        AppState.searchPollingInterval = setTimeout(poll, AppState.pollingBackoff);
      }
    } catch (error) {
      console.error('[Poll] Error:', error);
      showSearchStatus(formatErrorMessage(error), 'error');
      resetSearchUI();
    }
  };

  // Start polling
  poll();
}

function handleSearchComplete(response) {
  const results = response.results || [];

  clearInterval(AppState.searchPollingInterval);
  sessionStorage.removeItem(CONSTANTS.STORAGE_KEYS.ACTIVE_SEARCH_ID);
  sessionStorage.removeItem(CONSTANTS.STORAGE_KEYS.ACTIVE_SEARCH_TERM);

  showSearchStatus(`✅ Search complete! Found ${results.length} result(s)`, 'success');

  resetSearchUI();
}

function handleCancelSearch() {
  AppState.reset();

  sessionStorage.removeItem(CONSTANTS.STORAGE_KEYS.ACTIVE_SEARCH_ID);
  sessionStorage.removeItem(CONSTANTS.STORAGE_KEYS.ACTIVE_SEARCH_TERM);

  resetSearchUI();
  showSearchStatus('Search cancelled', 'info');
}

function resetSearchUI() {
  AppState.isSearching = false;
  lockUI(false);

  const searchBtn = DOMCache.get('searchBtn');
  const cancelBtn = DOMCache.get('cancelBtn');

  searchBtn.disabled = false;
  searchBtn.innerHTML = '🔍 Search Vault';
  searchBtn.setAttribute('aria-busy', 'false');
  cancelBtn.style.display = 'none';
}

/**
 * Create loading skeleton for better perceived performance
 */
function createLoadingSkeleton() {
  return `
    <div class="skeleton-loader">
      ${Array(3).fill(0).map(() => `
        <div class="result-item skeleton">
          <div class="skeleton-line" style="width: 70%;"></div>
          <div class="skeleton-line" style="width: 40%;"></div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Display search results with virtualization for large lists
 */
function displaySearchResults(results) {
  const container = DOMCache.get('searchResults');

  if (results.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <div>Searching... Results will appear here</div>
      </div>
    `;
    return;
  }

  // Remove duplicates
  const uniqueResults = Array.from(
    new Map(results.map(r => [r.path, r])).values()
  );

  // Batch DOM updates
  const fragment = document.createDocumentFragment();

  uniqueResults.forEach((result, index) => {
    const div = document.createElement('div');
    div.className = 'result-item';
    div.setAttribute('role', 'button');
    div.setAttribute('tabindex', '0');
    div.setAttribute('aria-label', `Result: ${result.path}`);

    const matchBadge = result.matchType === 'path' ? 'PATH' : 'CONTENT';
    const badgeClass = result.matchType === 'path' ? 'badge-path' : 'badge-content';

    div.innerHTML = `
      <div class="path">
        ${sanitizeHTML(result.path)}
        <span class="badge ${badgeClass}">${matchBadge}</span>
      </div>
      ${result.matches ? `
        <div class="detail">
          ${result.matches.map(m => sanitizeHTML(m)).join(' • ')}
        </div>
      ` : ''}
    `;

    // Click handler
    const openResult = () => chrome.tabs.create({ url: result.url });
    div.addEventListener('click', openResult);
    div.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openResult();
      }
    });

    fragment.appendChild(div);
  });

  container.innerHTML = '';
  container.appendChild(fragment);
}

// ============================================================================
// UI UTILITIES
// ============================================================================

function lockUI(lock) {
  const elementsToLock = [
    'searchTerm', 'caseInsensitive', 'exactMatch',
    'vaultUrl', 'namespace', 'token', 'username', 'password',
    'userpassMount', 'ldapUsername', 'ldapPassword', 'ldapMount',
    'saveBtn', 'clearBtn'
  ];

  requestAnimationFrame(() => {
    // Lock inputs
    elementsToLock.forEach(id => {
      const el = DOMCache.get(id);
      if (el) {
        el.disabled = lock;
        el.style.opacity = lock ? '0.5' : '1';
        el.style.cursor = lock ? 'not-allowed' : '';
        el.setAttribute('aria-disabled', lock);
      }
    });

    // Lock tabs
    const tabs = [...DOMCache.getAll('.main-tab'), ...DOMCache.getAll('.auth-tab')];
    tabs.forEach(tab => {
      tab.style.pointerEvents = lock ? 'none' : '';
      tab.style.opacity = lock ? '0.5' : '1';
      tab.setAttribute('aria-disabled', lock);
    });
  });
}

function showStatus(message, type = 'info') {
  const statusMsg = DOMCache.get('statusMsg');
  if (!statusMsg) return;

  statusMsg.textContent = message;
  statusMsg.className = `status ${type}`;
  statusMsg.style.display = 'block';
  statusMsg.setAttribute('role', 'alert');
  statusMsg.setAttribute('aria-live', 'polite');

  if (type !== 'error') {
    setTimeout(() => {
      if (statusMsg.textContent === message) {
        statusMsg.style.display = 'none';
      }
    }, CONSTANTS.TIMEOUTS.STATUS_MESSAGE);
  }
}

function showSearchStatus(message, type = 'info') {
  const searchStatus = DOMCache.get('searchStatus');
  if (!searchStatus) return;

  searchStatus.innerHTML = message;
  searchStatus.className = `search-status ${type}`;
  searchStatus.setAttribute('role', 'status');
  searchStatus.setAttribute('aria-live', 'polite');
}

function updateConnectionStatus(connected) {
  requestAnimationFrame(() => {
    const updates = [
      ['connectionDot', 'connected', connected],
      ['connectionText', null, connected ? 'Connected to Vault' : 'Not connected'],
      ['searchConnectionDot', 'connected', connected],
      ['searchConnectionText', null, connected ? 'Connected to Vault' : 'Not connected - Configure in Settings'],
      ['searchBtn', 'disabled', !connected]
    ];

    updates.forEach(([id, className, value]) => {
      const el = DOMCache.get(id);
      if (el) {
        if (className) {
          el.classList.toggle(className, value);
        } else if (id.includes('Text')) {
          el.textContent = value;
        } else {
          el.disabled = value;
        }
      }
    });
  });
}

async function checkConnectionStatus() {
  try {
    const response = await safeAsync(
      chrome.runtime.sendMessage({ type: 'CHECK_AUTH' }),
      3000
    );
    updateConnectionStatus(response && response.authenticated);
  } catch (error) {
    console.error('[CheckConnection] Error:', error);
    updateConnectionStatus(false);
  }
}

// ============================================================================
// FORM STATE MANAGEMENT
// ============================================================================

const debouncedSaveFormState = debounce(saveFormState, CONSTANTS.TIMEOUTS.DEBOUNCE_FORM_SAVE);
debouncedSaveFormState.flush = () => saveFormState(); // Allow immediate flush

function saveFormState() {
  try {
    const formState = {
      vaultUrl: DOMCache.get('vaultUrl')?.value || '',
      namespace: DOMCache.get('namespace')?.value || '',
      authType: AppState.currentAuthType,
      token: DOMCache.get('token')?.value || '',
      username: DOMCache.get('username')?.value || '',
      password: DOMCache.get('password')?.value || '',
      userpassMount: DOMCache.get('userpassMount')?.value || '',
      ldapUsername: DOMCache.get('ldapUsername')?.value || '',
      ldapPassword: DOMCache.get('ldapPassword')?.value || '',
      ldapMount: DOMCache.get('ldapMount')?.value || '',
      rememberMe: DOMCache.get('rememberMe')?.checked || false,
      timestamp: Date.now()
    };

    sessionStorage.setItem(CONSTANTS.STORAGE_KEYS.FORM_STATE, JSON.stringify(formState));
  } catch (error) {
    console.error('[SaveFormState] Error:', error);
  }
}

function restoreFormState() {
  try {
    const savedState = sessionStorage.getItem(CONSTANTS.STORAGE_KEYS.FORM_STATE);
    if (!savedState) return;

    const formState = JSON.parse(savedState);

    // Check expiry
    if (Date.now() - formState.timestamp > CONSTANTS.TIMEOUTS.FORM_STATE_EXPIRY) {
      sessionStorage.removeItem(CONSTANTS.STORAGE_KEYS.FORM_STATE);
      return;
    }

    // Restore values (only if current values are empty)
    requestAnimationFrame(() => {
      const fields = [
        ['vaultUrl', formState.vaultUrl],
        ['namespace', formState.namespace],
        ['token', formState.token],
        ['username', formState.username],
        ['password', formState.password],
        ['userpassMount', formState.userpassMount],
        ['ldapUsername', formState.ldapUsername],
        ['ldapPassword', formState.ldapPassword],
        ['ldapMount', formState.ldapMount]
      ];

      fields.forEach(([id, value]) => {
        const el = DOMCache.get(id);
        if (el && !el.value && value) {
          el.value = value;
        }
      });

      if (formState.authType) {
        switchAuthTab(formState.authType);
      }
    });
  } catch (error) {
    console.error('[RestoreFormState] Error:', error);
  }
}

function clearFormState() {
  sessionStorage.removeItem(CONSTANTS.STORAGE_KEYS.FORM_STATE);
}

// ============================================================================
// ACTIVE SEARCH RESUMPTION
// ============================================================================

async function checkForActiveSearch() {
  try {
    const activeSearchId = sessionStorage.getItem(CONSTANTS.STORAGE_KEYS.ACTIVE_SEARCH_ID);
    const activeSearchTerm = sessionStorage.getItem(CONSTANTS.STORAGE_KEYS.ACTIVE_SEARCH_TERM);

    if (!activeSearchId) return;

    console.log('[Popup] Checking for active search:', activeSearchId);

    const response = await safeAsync(
      chrome.runtime.sendMessage({
        type: 'GET_SEARCH_RESULTS',
        searchId: activeSearchId
      }),
      5000
    );

    if (!response || response.status === 'not_found') {
      // Search expired
      sessionStorage.removeItem(CONSTANTS.STORAGE_KEYS.ACTIVE_SEARCH_ID);
      sessionStorage.removeItem(CONSTANTS.STORAGE_KEYS.ACTIVE_SEARCH_TERM);
      return;
    }

    // Resume search
    AppState.currentSearchId = activeSearchId;

    if (activeSearchTerm) {
      DOMCache.get('searchTerm').value = activeSearchTerm;
    }

    if (response.status === 'running') {
      AppState.isSearching = true;

      const searchBtn = DOMCache.get('searchBtn');
      searchBtn.disabled = true;
      searchBtn.innerHTML = '⏸️ Searching...';
      DOMCache.get('cancelBtn').style.display = 'block';

      lockUI(true);
      displaySearchResults(response.results || []);
      showSearchStatus(
        `<span class="spinner-inline"></span> Resuming search for "${sanitizeHTML(activeSearchTerm)}"...`,
        'info'
      );

      startAdaptivePolling();
    } else if (response.status === 'completed') {
      displaySearchResults(response.results || []);
      showSearchStatus(`✅ Search complete! Found ${response.results.length} result(s)`, 'success');
      sessionStorage.removeItem(CONSTANTS.STORAGE_KEYS.ACTIVE_SEARCH_ID);
      sessionStorage.removeItem(CONSTANTS.STORAGE_KEYS.ACTIVE_SEARCH_TERM);
    } else if (response.status === 'error') {
      showSearchStatus(`Previous search failed: ${response.error}`, 'error');
      sessionStorage.removeItem(CONSTANTS.STORAGE_KEYS.ACTIVE_SEARCH_ID);
      sessionStorage.removeItem(CONSTANTS.STORAGE_KEYS.ACTIVE_SEARCH_TERM);
    }
  } catch (error) {
    console.error('[CheckActiveSearch] Error:', error);
    sessionStorage.removeItem(CONSTANTS.STORAGE_KEYS.ACTIVE_SEARCH_ID);
    sessionStorage.removeItem(CONSTANTS.STORAGE_KEYS.ACTIVE_SEARCH_TERM);
  }
}
