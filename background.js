/**
 * Vault Search Extension - Background Service Worker
 * Author: Sandesh Sachdev
 * Version: 2.1.0
 *
 * Handles authentication state management, token storage, and message passing
 */

// In-memory storage for sensitive data (session-based)
let authState = {
  vaultUrl: null,
  namespace: null,
  token: null,
  authType: null,
  authenticated: false,
  lastActivity: null
};

// Active searches
let activeSearches = new Map();

// Constants
const TOKEN_EXPIRY_TIME = 12 * 60 * 60 * 1000; // 12 hours
const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // 1 minute

// Restore auth state on startup
(async function restoreAuthState() {
  try {
    const result = await chrome.storage.local.get(['authState']);
    if (result.authState && result.authState.authenticated) {
      const timeSinceLastActivity = Date.now() - result.authState.lastActivity;

      // Only restore if not expired
      if (timeSinceLastActivity < TOKEN_EXPIRY_TIME) {
        authState = result.authState;
        console.log('[Vault Search] Auth state restored from storage');

        // Set badge
        chrome.action.setBadgeText({ text: '✓' });
        chrome.action.setBadgeBackgroundColor({ color: '#10b981' });

        startActivityMonitoring();
      } else {
        console.log('[Vault Search] Stored auth expired, clearing');
        await chrome.storage.local.remove(['authState']);
      }
    }
  } catch (error) {
    console.error('[Vault Search] Error restoring auth state:', error);
  }
})();

// Initialize
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Vault Search] Extension installed/updated', details);

  if (details.reason === 'install') {
    // Open popup on first install
    chrome.action.openPopup();
  }
});

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Vault Search] Received message:', request.type);

  switch (request.type) {
    case 'STORE_AUTH':
      handleStoreAuth(request.data).then(result => {
        sendResponse(result);
      });
      return true; // Keep message channel open for async response

    case 'GET_AUTH':
      sendResponse(getAuthData());
      break;

    case 'CHECK_AUTH':
      sendResponse({ authenticated: authState.authenticated });
      break;

    case 'CHECK_CONNECTION':
      sendResponse({
        connected: authState.authenticated,
        vaultUrl: authState.vaultUrl || ''
      });
      break;

    case 'CLEAR_AUTH':
      clearAuthData().then(result => {
        sendResponse(result);
      });
      return true;

    case 'DISCONNECT':
      clearAuthData().then(result => {
        sendResponse(result);
      });
      return true;

    case 'REFRESH_TOKEN':
      handleRefreshToken(request.data).then(result => {
        sendResponse(result);
      });
      return true; // Keep message channel open for async response

    case 'START_SEARCH':
      handleStartSearch(request, sender).then(result => {
        sendResponse(result);
      });
      return true;

    case 'GET_SEARCH_RESULTS':
      const searchData = activeSearches.get(request.searchId);
      if (searchData) {
        sendResponse({
          success: true,
          status: searchData.status,
          results: searchData.results || [],
          error: searchData.error
        });
      } else {
        sendResponse({ success: false, status: 'not_found', results: [] });
      }
      break;

    case 'GET_ACTIVE_SEARCH':
      // Return the most recent active search
      let activeSearchId = null;
      let activeQuery = null;
      for (const [searchId, data] of activeSearches.entries()) {
        if (data.status === 'running') {
          activeSearchId = searchId;
          activeQuery = data.query;
          break;
        }
      }
      sendResponse({
        success: true,
        searchId: activeSearchId,
        query: activeQuery
      });
      break;

    case 'OPEN_RESULT':
      handleOpenResult(request).then(result => {
        sendResponse(result);
      });
      return true;

    case 'AUTH_TOKEN':
      handleAuthToken(request).then(result => {
        sendResponse(result);
      });
      return true;

    case 'AUTH_USERPASS':
      handleAuthUserPass(request).then(result => {
        sendResponse(result);
      });
      return true;

    case 'AUTH_LDAP':
      handleAuthLDAP(request).then(result => {
        sendResponse(result);
      });
      return true;

    case 'LOG':
      console.log('[Vault Search]', ...request.data);
      sendResponse({ success: true });
      break;

    default:
      console.warn('[Vault Search] Unknown message type:', request.type);
      sendResponse({ error: 'Unknown message type' });
  }

  return true; // Keep message channel open
});

// Store authentication data
async function handleStoreAuth(data) {
  authState = {
    vaultUrl: data.vaultUrl,
    namespace: data.namespace,
    token: data.token,
    authType: data.authType,
    authenticated: true,
    lastActivity: Date.now()
  };

  // Persist to storage
  try {
    await chrome.storage.local.set({ authState });
    console.log('[Vault Search] Auth stored successfully to persistent storage');
  } catch (error) {
    console.error('[Vault Search] Error storing auth:', error);
  }

  // Set badge to indicate active connection
  chrome.action.setBadgeText({ text: '✓' });
  chrome.action.setBadgeBackgroundColor({ color: '#10b981' });

  // Start activity monitoring
  startActivityMonitoring();

  return { success: true };
}

// Get authentication data
function getAuthData() {
  if (!authState.authenticated) {
    return { authenticated: false, error: 'Not authenticated' };
  }

  // Check if token has expired
  const timeSinceLastActivity = Date.now() - authState.lastActivity;
  if (timeSinceLastActivity > TOKEN_EXPIRY_TIME) {
    console.log('[Vault Search] Token expired due to inactivity');
    clearAuthData();
    return { authenticated: false, error: 'Session expired' };
  }

  // Update last activity
  authState.lastActivity = Date.now();

  // Update storage
  chrome.storage.local.set({ authState }).catch(err => {
    console.error('[Vault Search] Error updating auth activity:', err);
  });

  return {
    authenticated: true,
    vaultUrl: authState.vaultUrl,
    namespace: authState.namespace,
    token: authState.token,
    authType: authState.authType
  };
}

// Clear authentication data
async function clearAuthData() {
  authState = {
    vaultUrl: null,
    namespace: null,
    token: null,
    authType: null,
    authenticated: false,
    lastActivity: null
  };

  // Clear from storage
  try {
    await chrome.storage.local.remove(['authState']);
    console.log('[Vault Search] Auth cleared from storage');
  } catch (error) {
    console.error('[Vault Search] Error clearing auth:', error);
  }

  chrome.action.setBadgeText({ text: '' });
  console.log('[Vault Search] Auth cleared');

  return { success: true };
}

// Refresh token (for renewable tokens)
async function handleRefreshToken(data) {
  if (!authState.authenticated) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const headers = {
      'X-Vault-Token': authState.token,
      'Content-Type': 'application/json'
    };

    if (authState.namespace) {
      headers['X-Vault-Namespace'] = authState.namespace;
    }

    const response = await fetch(`${authState.vaultUrl}/v1/auth/token/renew-self`, {
      method: 'POST',
      headers
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const result = await response.json();
    authState.token = result.auth.client_token;
    authState.lastActivity = Date.now();

    console.log('[Vault Search] Token refreshed successfully');
    return { success: true };

  } catch (error) {
    console.error('[Vault Search] Token refresh error:', error);
    return { success: false, error: error.message };
  }
}

// Handle token authentication
async function handleAuthToken(request) {
  try {
    const { vaultUrl, token } = request;

    if (!vaultUrl || !token) {
      return { success: false, error: 'Vault URL and token are required' };
    }

    // Verify token by making a simple API call
    const headers = { 'X-Vault-Token': token };
    const response = await fetch(`${vaultUrl}/v1/sys/health`, { headers });

    if (!response.ok && response.status !== 429 && response.status !== 503) {
      throw new Error('Invalid token or Vault URL');
    }

    // Store auth
    return await handleStoreAuth({
      vaultUrl,
      token,
      authType: 'token',
      namespace: null
    });
  } catch (error) {
    console.error('[Vault Search] Token auth error:', error);
    return { success: false, error: error.message };
  }
}

// Handle userpass authentication
async function handleAuthUserPass(request) {
  try {
    const { vaultUrl, username, password } = request;

    if (!vaultUrl || !username || !password) {
      return { success: false, error: 'Vault URL, username, and password are required' };
    }

    const response = await fetch(`${vaultUrl}/v1/auth/userpass/login/${username}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status}`);
    }

    const result = await response.json();

    // Store auth
    return await handleStoreAuth({
      vaultUrl,
      token: result.auth.client_token,
      authType: 'userpass',
      namespace: null
    });
  } catch (error) {
    console.error('[Vault Search] UserPass auth error:', error);
    return { success: false, error: error.message };
  }
}

// Handle LDAP authentication
async function handleAuthLDAP(request) {
  try {
    const { vaultUrl, username, password } = request;

    if (!vaultUrl || !username || !password) {
      return { success: false, error: 'Vault URL, username, and password are required' };
    }

    const response = await fetch(`${vaultUrl}/v1/auth/ldap/login/${username}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status}`);
    }

    const result = await response.json();

    // Store auth
    return await handleStoreAuth({
      vaultUrl,
      token: result.auth.client_token,
      authType: 'ldap',
      namespace: null
    });
  } catch (error) {
    console.error('[Vault Search] LDAP auth error:', error);
    return { success: false, error: error.message };
  }
}

// Handle opening a result
async function handleOpenResult(request) {
  try {
    const { path, resultType } = request;

    if (!authState.authenticated) {
      return { success: false, error: 'Not authenticated' };
    }

    // For directories, we could list contents (future enhancement)
    // For now, just copy the path to clipboard
    await navigator.clipboard.writeText(path);

    // Send notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon128.png',
      title: 'Vault Search Pro',
      message: `Path copied: ${path}`
    });

    return { success: true };
  } catch (error) {
    console.error('[Vault Search] Open result error:', error);
    return { success: false, error: error.message };
  }
}

// Handle search in background (continues even if popup closes)
async function handleStartSearch(request, sender) {
  const searchId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Get auth state
  const auth = getAuthData();
  if (!auth.authenticated) {
    return { success: false, error: 'Not authenticated' };
  }

  // Extract search parameters (support both formats)
  const searchTerm = request.query || request.data?.term || '';
  const options = request.options || {};

  // Initialize search state
  activeSearches.set(searchId, {
    status: 'running',
    results: [],
    progress: 0,
    error: null,
    query: searchTerm,
    options
  });

  // Start search in background (don't await)
  performBackgroundSearch(searchId, {
    term: searchTerm,
    vaultUrl: auth.vaultUrl,
    token: auth.token,
    namespace: auth.namespace,
    options
  }).catch(error => {
    console.error('[Vault Search] Background search error:', error);
    const searchState = activeSearches.get(searchId);
    if (searchState) {
      searchState.status = 'error';
      searchState.error = error.message;
    }
  });

  return { success: true, searchId };
}

// Perform comprehensive search in background
async function performBackgroundSearch(searchId, { term, vaultUrl, token, namespace }) {
  const searchState = activeSearches.get(searchId);
  if (!searchState) return;

  try {
    const results = [];

    // List all mounts
    const mountsUrl = `${vaultUrl}/v1/sys/mounts`;
    const headers = { 'X-Vault-Token': token };
    if (namespace) headers['X-Vault-Namespace'] = namespace;

    const mountsResponse = await fetch(mountsUrl, { headers });
    if (!mountsResponse.ok) {
      throw new Error(`Failed to list mounts: ${mountsResponse.statusText}`);
    }

    const mountsData = await mountsResponse.json();
    const kvMounts = Object.entries(mountsData.data || {})
      .filter(([_, v]) => v.type === 'kv' || v.type === 'generic')
      .map(([k]) => k);

    // Search all mounts in parallel
    const searchPromises = kvMounts.map(mount =>
      searchMount(vaultUrl, token, namespace, mount, term, searchState)
    );

    const mountResults = await Promise.allSettled(searchPromises);

    // Collect all results
    mountResults.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        results.push(...result.value);
      }
    });

    // Update final state
    searchState.status = 'completed';
    searchState.results = results;
    searchState.progress = 100;

    // Auto-cleanup after 5 minutes
    setTimeout(() => {
      activeSearches.delete(searchId);
    }, 5 * 60 * 1000);

  } catch (error) {
    searchState.status = 'error';
    searchState.error = error.message;
  }
}

// Search a single mount
async function searchMount(vaultUrl, token, namespace, mount, term, searchState) {
  const results = [];
  const headers = { 'X-Vault-Token': token };
  if (namespace) headers['X-Vault-Namespace'] = namespace;

  try {
    // List all paths recursively
    const paths = await listAllPaths(vaultUrl, token, namespace, mount, '', 10);

    for (const pathObj of paths) {
      const path = typeof pathObj === 'string' ? pathObj : pathObj.path;
      const pathType = typeof pathObj === 'string' ? 'file' : pathObj.type;
      const fullPath = `${mount}${path}`;
      const lowerTerm = term.toLowerCase();
      const lowerPath = fullPath.toLowerCase();

      // Check if path matches (any match type)
      const pathMatches = lowerPath.includes(lowerTerm) ||
                         fuzzyMatch(lowerPath, lowerTerm) ||
                         fullPath === term;

      if (pathMatches) {
        // Remove trailing slash for display
        const displayPath = path.endsWith('/') ? path.slice(0, -1) : path;
        const displayFullPath = `${mount}${displayPath}`;
        results.push({
          path: displayFullPath,
          mount: mount,
          type: 'path',
          url: `${vaultUrl}/ui/vault/secrets/${mount}/show/${displayPath}`,
          matchType: pathType === 'directory' ? 'directory' : 'path',
          isDirectory: pathType === 'directory'
        });
      }

      // Only search content for files, not directories
      if (pathType !== 'directory') {
        // Try to read secret and search content
        try {
        const isKv2 = await checkIfKv2(vaultUrl, token, namespace, mount);
        const dataPath = isKv2 ? `${mount}data/${path}` : `${mount}${path}`;
        const secretUrl = `${vaultUrl}/v1/${dataPath}`;

        const secretResponse = await fetch(secretUrl, { headers });
        if (secretResponse.ok) {
          const secretData = await secretResponse.json();
          const data = isKv2 ? secretData.data?.data : secretData.data;

          if (data) {
            const matches = searchInData(data, term);
            if (matches.length > 0) {
              results.push({
                path: fullPath,
                mount: mount,
                type: 'content',
                url: `${vaultUrl}/ui/vault/secrets/${mount}/show/${path}`,
                matchType: 'content',
                matches: matches.slice(0, 3)
              });
            }
          }
        }
      } catch (e) {
        // Skip secrets we can't read
      }
    }

      // Update progress
      if (searchState) {
        searchState.results = results;
      }
    }
  } catch (error) {
    console.error(`[Vault Search] Error searching mount ${mount}:`, error);
  }

  return results;
}

// List all paths recursively
async function listAllPaths(vaultUrl, token, namespace, mount, prefix, maxDepth, depth = 0) {
  if (depth >= maxDepth) return [];

  const paths = [];
  const headers = { 'X-Vault-Token': token };
  if (namespace) headers['X-Vault-Namespace'] = namespace;

  try {
    // Check if KV2
    const isKv2 = await checkIfKv2(vaultUrl, token, namespace, mount);
    const listPath = isKv2 ? `${mount}metadata/${prefix}` : `${mount}${prefix}`;
    const listUrl = `${vaultUrl}/v1/${listPath}?list=true`;

    const response = await fetch(listUrl, { headers });
    if (!response.ok) return [];

    const data = await response.json();
    const keys = data.data?.keys || [];

    for (const key of keys) {
      const fullPath = prefix + key;
      if (key.endsWith('/')) {
        // Directory - ADD to results (this was missing!)
        paths.push({
          path: fullPath,
          type: 'directory'
        });
        // Then recurse into subdirectories
        const subPaths = await listAllPaths(vaultUrl, token, namespace, mount, fullPath, maxDepth, depth + 1);
        paths.push(...subPaths);
      } else {
        // File
        paths.push({
          path: fullPath,
          type: 'file'
        });
      }
    }
  } catch (e) {
    // Skip paths we can't list
  }

  return paths;
}// Check if mount is KV2
const kv2Cache = new Map();
async function checkIfKv2(vaultUrl, token, namespace, mount) {
  if (kv2Cache.has(mount)) {
    return kv2Cache.get(mount);
  }

  try {
    const headers = { 'X-Vault-Token': token };
    if (namespace) headers['X-Vault-Namespace'] = namespace;

    const response = await fetch(`${vaultUrl}/v1/sys/internal/ui/mounts/${mount}`, { headers });
    if (response.ok) {
      const data = await response.json();
      const isKv2 = data.data?.options?.version === '2';
      kv2Cache.set(mount, isKv2);
      return isKv2;
    }
  } catch (e) {
    // Assume KV1 if we can't determine
  }

  kv2Cache.set(mount, false);
  return false;
}

// Search within secret data
function searchInData(data, term) {
  const matches = [];
  const lowerTerm = term.toLowerCase();

  function searchObject(obj, path = '') {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      const lowerKey = key.toLowerCase();
      const valueStr = String(value).toLowerCase();

      if (lowerKey.includes(lowerTerm) ||
          fuzzyMatch(lowerKey, lowerTerm) ||
          valueStr.includes(lowerTerm) ||
          fuzzyMatch(valueStr, lowerTerm)) {
        matches.push(`${currentPath}: ${String(value).substring(0, 100)}`);
      }

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        searchObject(value, currentPath);
      }
    }
  }

  searchObject(data);
  return matches;
}

// Fuzzy match helper
function fuzzyMatch(str, pattern) {
  if (pattern.length > str.length) return false;
  if (pattern === str) return true;

  let patternIdx = 0;
  let strIdx = 0;

  while (patternIdx < pattern.length && strIdx < str.length) {
    if (pattern[patternIdx] === str[strIdx]) {
      patternIdx++;
    }
    strIdx++;
  }

  return patternIdx === pattern.length;
}

// Monitor activity and expire sessions
let activityCheckInterval = null;

function startActivityMonitoring() {
  if (activityCheckInterval) {
    clearInterval(activityCheckInterval);
  }

  activityCheckInterval = setInterval(() => {
    if (authState.authenticated) {
      const timeSinceLastActivity = Date.now() - authState.lastActivity;

      if (timeSinceLastActivity > TOKEN_EXPIRY_TIME) {
        console.log('[Vault Search] Session expired due to inactivity');
        clearAuthData();

        // Notify user
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon128.png',
          title: 'Vault Search',
          message: 'Your session has expired. Please log in again.',
          priority: 1
        });
      }
    }
  }, ACTIVITY_CHECK_INTERVAL);
}

// Context menu for quick access
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'vault-search-settings',
    title: 'Vault Search Settings',
    contexts: ['action']
  });

  chrome.contextMenus.create({
    id: 'vault-search-disconnect',
    title: 'Disconnect',
    contexts: ['action']
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'vault-search-settings') {
    chrome.action.openPopup();
  } else if (info.menuItemId === 'vault-search-disconnect') {
    clearAuthData();
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon128.png',
      title: 'Vault Search',
      message: 'Disconnected from Vault',
      priority: 0
    });
  }
});

// Listen for storage changes (from popup)
chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log('[Vault Search] Storage changed:', changes);
});

console.log('[Vault Search] Background service worker initialized');
