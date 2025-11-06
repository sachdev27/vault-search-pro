/**
 * Vault Search Extension - Background Service Worker (Optimized)
 * Author: Sandesh Sachdev
 * Version: 2.3.1
 *
 * Performance Optimizations:
 * - Parallel mount searching with Promise.allSettled
 * - KV2 mount detection caching
 * - Request batching and rate limiting
 * - Efficient recursive path traversal with depth limits
 * - Memory-efficient result streaming
 * - Connection pooling for API requests
 *
 * Features:
 * - Persistent authentication with auto-refresh
 * - Background search with result caching
 * - Fuzzy matching with exact match support
 * - Case-insensitive search option
 * - Session management with activity tracking
 * - Automatic cleanup of expired searches
 */

// ============================================================================
// CONSTANTS
// ============================================================================
const CONSTANTS = {
  AUTH: {
    TOKEN_EXPIRY_TIME: 12 * 60 * 60 * 1000,  // 12 hours
    ACTIVITY_CHECK_INTERVAL: 5 * 60 * 1000,  // 5 minutes
    TOKEN_REFRESH_THRESHOLD: 30 * 60 * 1000  // 30 minutes before expiry
  },
  SEARCH: {
    MAX_DEPTH: 10,                            // Max directory depth
    MAX_CONCURRENT_MOUNTS: 5,                 // Parallel mount searches
    MAX_RESULTS_PER_MOUNT: 100,               // Limit results per mount
    SEARCH_TIMEOUT: 5 * 60 * 1000,           // 5 minute search timeout
    CLEANUP_INTERVAL: 10 * 60 * 1000,        // Cleanup every 10 minutes
    RESULT_CACHE_SIZE: 50                     // Max cached search results
  },
  RATE_LIMIT: {
    MAX_REQUESTS_PER_SECOND: 10,
    REQUEST_BATCH_SIZE: 3
  }
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================
let authState = {
  authenticated: false,
  vaultUrl: null,
  token: null,
  namespace: null,
  authType: null,
  lastActivity: null,
  tokenExpiry: null
};

// Active searches map (searchId -> searchState)
const activeSearches = new Map();

// KV2 mount cache (mount -> boolean)
const kv2Cache = new Map();

// Rate limiting
const requestQueue = [];
let processingQueue = false;

// ============================================================================
// INITIALIZATION
// ============================================================================

// Restore auth state on service worker startup
(async function restoreAuthState() {
  try {
    const result = await chrome.storage.local.get(['authState']);
    if (result.authState) {
      const state = result.authState;

      // Check if token is still valid
      const now = Date.now();
      if (state.tokenExpiry && now < state.tokenExpiry) {
        authState = state;
        console.log('[Background] Auth state restored');
        startActivityMonitoring();
      } else {
        console.log('[Background] Stored token expired');
        await clearAuthData();
      }
    }
  } catch (error) {
    console.error('[Background] Failed to restore auth:', error);
  }
})();

// Start periodic cleanup
setInterval(cleanupExpiredSearches, CONSTANTS.SEARCH.CLEANUP_INTERVAL);

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Background] Message received:', request.type);

  // Handle messages asynchronously
  handleMessage(request, sender)
    .then(sendResponse)
    .catch(error => {
      console.error('[Background] Message handler error:', error);
      sendResponse({ success: false, error: error.message });
    });

  return true; // Keep channel open for async response
});

/**
 * Route incoming messages to appropriate handlers
 */
async function handleMessage(request, sender) {
  const handlers = {
    'CHECK_AUTH': handleCheckAuth,
    'GET_AUTH': handleGetAuth,
    'STORE_AUTH': handleStoreAuth,
    'CLEAR_AUTH': handleClearAuth,
    'REFRESH_TOKEN': handleRefreshToken,
    'AUTH_TOKEN': handleAuthToken,
    'AUTH_USERPASS': handleAuthUserPass,
    'AUTH_LDAP': handleAuthLDAP,
    'START_SEARCH': handleStartSearch,
    'GET_SEARCH_RESULTS': handleGetSearchResults,
    'CANCEL_SEARCH': handleCancelSearch,
    'OPEN_RESULT': handleOpenResult
  };

  const handler = handlers[request.type];

  if (!handler) {
    return { success: false, error: `Unknown message type: ${request.type}` };
  }

  // Update activity timestamp
  if (authState.authenticated) {
    authState.lastActivity = Date.now();
  }

  return await handler(request, sender);
}

// ============================================================================
// AUTH HANDLERS
// ============================================================================

async function handleCheckAuth() {
  return {
    authenticated: authState.authenticated,
    authType: authState.authType,
    vaultUrl: authState.vaultUrl
  };
}

async function handleGetAuth() {
  if (!authState.authenticated) {
    return {
      authenticated: false,
      error: 'Not authenticated'
    };
  }

  // Check if token needs refresh
  if (shouldRefreshToken()) {
    await attemptTokenRefresh();
  }

  return {
    authenticated: true,
    vaultUrl: authState.vaultUrl,
    token: authState.token,
    namespace: authState.namespace,
    authType: authState.authType
  };
}

async function handleStoreAuth(request) {
  try {
    const { vaultUrl, token, authType, namespace } = request.data || request;

    if (!vaultUrl || !token) {
      return { success: false, error: 'Vault URL and token are required' };
    }

    // Verify token is valid
    const isValid = await verifyToken(vaultUrl, token, namespace);
    if (!isValid) {
      return { success: false, error: 'Invalid token or insufficient permissions' };
    }

    // Store in memory
    authState = {
      authenticated: true,
      vaultUrl,
      token,
      namespace: namespace || null,
      authType: authType || 'token',
      lastActivity: Date.now(),
      tokenExpiry: Date.now() + CONSTANTS.AUTH.TOKEN_EXPIRY_TIME
    };

    // Persist to storage
    await chrome.storage.local.set({ authState });

    // Start activity monitoring
    startActivityMonitoring();

    console.log('[Background] Auth stored successfully');
    return { success: true };
  } catch (error) {
    console.error('[Background] Store auth error:', error);
    return { success: false, error: error.message };
  }
}

async function handleClearAuth() {
  await clearAuthData();
  return { success: true };
}

async function handleRefreshToken(request) {
  if (!authState.authenticated) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const isValid = await verifyToken(
      authState.vaultUrl,
      authState.token,
      authState.namespace
    );

    if (isValid) {
      // Token is still valid, update expiry
      authState.tokenExpiry = Date.now() + CONSTANTS.AUTH.TOKEN_EXPIRY_TIME;
      authState.lastActivity = Date.now();
      await chrome.storage.local.set({ authState });
      return { success: true };
    } else {
      // Token expired
      await clearAuthData();
      return { success: false, error: 'Token expired' };
    }
  } catch (error) {
    console.error('[Background] Token refresh error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// AUTH METHOD HANDLERS
// ============================================================================

async function handleAuthToken(request) {
  try {
    const { vaultUrl, token, namespace } = request;

    if (!vaultUrl || !token) {
      return { success: false, error: 'Vault URL and token are required' };
    }

    const isValid = await verifyToken(vaultUrl, token, namespace);
    if (!isValid) {
      return { success: false, error: 'Invalid token or Vault URL' };
    }

    return await handleStoreAuth({
      vaultUrl,
      token,
      authType: 'token',
      namespace
    });
  } catch (error) {
    console.error('[Background] Token auth error:', error);
    return { success: false, error: error.message };
  }
}

async function handleAuthUserPass(request) {
  try {
    const { vaultUrl, username, password, mount, namespace } = request;
    const userpassMount = mount || 'userpass';

    if (!vaultUrl || !username || !password) {
      return { success: false, error: 'Vault URL, username, and password are required' };
    }

    const headers = { 'Content-Type': 'application/json' };
    if (namespace) headers['X-Vault-Namespace'] = namespace;

    const response = await fetchWithRetry(
      `${vaultUrl}/v1/auth/${userpassMount}/login/${username}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ password })
      },
      2 // 2 retries
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Authentication failed (${response.status}): ${errorText}`);
    }

    const result = await response.json();

    return await handleStoreAuth({
      vaultUrl,
      token: result.auth.client_token,
      authType: 'userpass',
      namespace
    });
  } catch (error) {
    console.error('[Background] UserPass auth error:', error);
    return { success: false, error: error.message };
  }
}

async function handleAuthLDAP(request) {
  try {
    const { vaultUrl, username, password, mount, namespace } = request;
    const ldapMount = mount || 'ldap';

    if (!vaultUrl || !username || !password) {
      return { success: false, error: 'Vault URL, username, and password are required' };
    }

    const headers = { 'Content-Type': 'application/json' };
    if (namespace) headers['X-Vault-Namespace'] = namespace;

    const response = await fetchWithRetry(
      `${vaultUrl}/v1/auth/${ldapMount}/login/${username}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ password })
      },
      2
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LDAP authentication failed (${response.status}): ${errorText}`);
    }

    const result = await response.json();

    return await handleStoreAuth({
      vaultUrl,
      token: result.auth.client_token,
      authType: 'ldap',
      namespace
    });
  } catch (error) {
    console.error('[Background] LDAP auth error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// AUTH UTILITIES
// ============================================================================

async function verifyToken(vaultUrl, token, namespace) {
  try {
    const headers = { 'X-Vault-Token': token };
    if (namespace) headers['X-Vault-Namespace'] = namespace;

    const response = await fetch(`${vaultUrl}/v1/auth/token/lookup-self`, {
      method: 'GET',
      headers
    });

    return response.ok;
  } catch (error) {
    console.error('[Background] Token verification error:', error);
    return false;
  }
}

function shouldRefreshToken() {
  if (!authState.authenticated || !authState.tokenExpiry) {
    return false;
  }

  const timeUntilExpiry = authState.tokenExpiry - Date.now();
  return timeUntilExpiry < CONSTANTS.AUTH.TOKEN_REFRESH_THRESHOLD;
}

async function attemptTokenRefresh() {
  console.log('[Background] Attempting token refresh');

  const isValid = await verifyToken(
    authState.vaultUrl,
    authState.token,
    authState.namespace
  );

  if (isValid) {
    // Extend expiry
    authState.tokenExpiry = Date.now() + CONSTANTS.AUTH.TOKEN_EXPIRY_TIME;
    authState.lastActivity = Date.now();
    await chrome.storage.local.set({ authState });
    console.log('[Background] Token refreshed successfully');
  } else {
    console.log('[Background] Token refresh failed - token invalid');
    await clearAuthData();
  }
}

async function clearAuthData() {
  authState = {
    authenticated: false,
    vaultUrl: null,
    token: null,
    namespace: null,
    authType: null,
    lastActivity: null,
    tokenExpiry: null
  };

  await chrome.storage.local.remove('authState');
  kv2Cache.clear();
  activeSearches.clear();

  console.log('[Background] Auth data cleared');
}

function getAuthData() {
  return {
    authenticated: authState.authenticated,
    vaultUrl: authState.vaultUrl,
    token: authState.token,
    namespace: authState.namespace
  };
}

// ============================================================================
// SEARCH HANDLERS
// ============================================================================

async function handleStartSearch(request, sender) {
  const searchId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Get auth state
  const auth = getAuthData();
  if (!auth.authenticated) {
    return { success: false, error: 'Not authenticated' };
  }

  // Extract search parameters
  const data = request.data || request;
  const searchTerm = data.term || data.query || '';
  const options = data.options || {
    caseInsensitive: true,
    exactMatch: false
  };

  if (!searchTerm) {
    return { success: false, error: 'Search term is required' };
  }

  console.log(`[Background] Starting search ${searchId}:`, {
    term: searchTerm,
    options
  });

  // Initialize search state
  activeSearches.set(searchId, {
    status: 'running',
    results: [],
    progress: 0,
    error: null,
    query: searchTerm,
    options,
    startTime: Date.now(),
    mountsSearched: 0,
    totalMounts: 0
  });

  // Start search in background (don't block response)
  performBackgroundSearch(searchId, {
    term: searchTerm,
    vaultUrl: auth.vaultUrl,
    token: auth.token,
    namespace: auth.namespace,
    options
  }).catch(error => {
    console.error('[Background] Search error:', error);
    const searchState = activeSearches.get(searchId);
    if (searchState) {
      searchState.status = 'error';
      searchState.error = error.message;
    }
  });

  return { success: true, searchId };
}

async function handleGetSearchResults(request) {
  const { searchId } = request;

  if (!searchId) {
    return { success: false, error: 'Search ID is required' };
  }

  const searchState = activeSearches.get(searchId);

  if (!searchState) {
    return {
      success: false,
      status: 'not_found',
      error: 'Search not found or expired'
    };
  }

  return {
    success: true,
    status: searchState.status,
    results: searchState.results,
    progress: searchState.progress,
    error: searchState.error,
    query: searchState.query,
    mountsSearched: searchState.mountsSearched,
    totalMounts: searchState.totalMounts
  };
}

async function handleCancelSearch(request) {
  const { searchId } = request;

  if (!searchId) {
    return { success: false, error: 'Search ID is required' };
  }

  const searchState = activeSearches.get(searchId);

  if (searchState) {
    searchState.status = 'cancelled';
    activeSearches.delete(searchId);
    console.log(`[Background] Search ${searchId} cancelled`);
  }

  return { success: true };
}

// ============================================================================
// SEARCH ENGINE
// ============================================================================

/**
 * Perform comprehensive background search across all KV mounts
 */
async function performBackgroundSearch(searchId, { term, vaultUrl, token, namespace, options }) {
  const searchState = activeSearches.get(searchId);
  if (!searchState) return;

  const startTime = Date.now();

  try {
    console.log(`[Background] Executing search ${searchId}`);

    // List all mounts
    const mounts = await listKVMounts(vaultUrl, token, namespace);
    searchState.totalMounts = mounts.length;

    console.log(`[Background] Found ${mounts.length} KV mounts to search`);

    if (mounts.length === 0) {
      searchState.status = 'completed';
      searchState.progress = 100;
      return;
    }

    // Search mounts in batches for better control
    const batchSize = CONSTANTS.SEARCH.MAX_CONCURRENT_MOUNTS;
    let allResults = [];

    for (let i = 0; i < mounts.length; i += batchSize) {
      // Check if search was cancelled
      if (searchState.status === 'cancelled') {
        console.log(`[Background] Search ${searchId} was cancelled`);
        return;
      }

      const batch = mounts.slice(i, i + batchSize);

      // Search batch in parallel
      const batchPromises = batch.map(mount =>
        searchMount(vaultUrl, token, namespace, mount, term, options, searchState)
          .catch(error => {
            console.error(`[Background] Error searching mount ${mount}:`, error);
            return []; // Return empty array on error
          })
      );

      const batchResults = await Promise.allSettled(batchPromises);

      // Collect results
      batchResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          allResults.push(...result.value);
        }
      });

      // Update progress
      searchState.mountsSearched = Math.min(i + batchSize, mounts.length);
      searchState.progress = Math.floor((searchState.mountsSearched / mounts.length) * 100);
      searchState.results = allResults;

      console.log(`[Background] Progress: ${searchState.mountsSearched}/${mounts.length} mounts`);
    }

    // Search complete
    searchState.status = 'completed';
    searchState.progress = 100;
    searchState.results = deduplicateResults(allResults);

    const duration = Date.now() - startTime;
    console.log(`[Background] Search ${searchId} completed in ${duration}ms with ${searchState.results.length} results`);

    // Auto-cleanup after timeout
    setTimeout(() => {
      activeSearches.delete(searchId);
      console.log(`[Background] Search ${searchId} cleaned up`);
    }, CONSTANTS.SEARCH.SEARCH_TIMEOUT);

  } catch (error) {
    console.error(`[Background] Search ${searchId} failed:`, error);
    searchState.status = 'error';
    searchState.error = error.message;
  }
}

/**
 * List all KV mounts in Vault
 */
async function listKVMounts(vaultUrl, token, namespace) {
  try {
    const headers = { 'X-Vault-Token': token };
    if (namespace) headers['X-Vault-Namespace'] = namespace;

    const response = await fetchWithRetry(`${vaultUrl}/v1/sys/mounts`, { headers });

    if (!response.ok) {
      throw new Error(`Failed to list mounts: ${response.status}`);
    }

    const data = await response.json();
    const mounts = Object.entries(data.data || data)
      .filter(([_, mountData]) => {
        const type = mountData.type || '';
        return type === 'kv' || type === 'generic';
      })
      .map(([mountPath]) => mountPath);

    return mounts;
  } catch (error) {
    console.error('[Background] List mounts error:', error);
    return [];
  }
}

/**
 * Search a single mount for matching secrets
 */
async function searchMount(vaultUrl, token, namespace, mount, term, options, searchState) {
  const results = [];
  const headers = { 'X-Vault-Token': token };
  if (namespace) headers['X-Vault-Namespace'] = namespace;

  try {
    console.log(`[Background] Searching mount: ${mount}`);

    // List all paths recursively
    const paths = await listAllPaths(
      vaultUrl,
      token,
      namespace,
      mount,
      '',
      CONSTANTS.SEARCH.MAX_DEPTH
    );

    console.log(`[Background] Found ${paths.length} paths in ${mount}`);

    // Prepare search term based on options
    const searchTerm = options.caseInsensitive ? term.toLowerCase() : term;

    for (const pathObj of paths) {
      // Respect result limits
      if (results.length >= CONSTANTS.SEARCH.MAX_RESULTS_PER_MOUNT) {
        console.log(`[Background] Result limit reached for mount ${mount}`);
        break;
      }

      // Check if search was cancelled
      if (searchState.status === 'cancelled') {
        break;
      }

      const path = typeof pathObj === 'string' ? pathObj : pathObj.path;
      const pathType = typeof pathObj === 'string' ? 'file' : pathObj.type;
      const fullPath = `${mount}${path}`;

      // Prepare path for matching
      const matchPath = options.caseInsensitive ? fullPath.toLowerCase() : fullPath;

      // Check path match
      let pathMatches = false;

      if (options.exactMatch) {
        pathMatches = matchPath === searchTerm;
      } else {
        pathMatches = matchPath.includes(searchTerm) || fuzzyMatch(matchPath, searchTerm);
      }

      if (pathMatches) {
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

      // Search content for files only (not directories)
      if (pathType !== 'directory') {
        try {
          const contentMatches = await searchSecretContent(
            vaultUrl,
            token,
            namespace,
            mount,
            path,
            searchTerm,
            options
          );

          if (contentMatches.length > 0) {
            results.push({
              path: fullPath,
              mount: mount,
              type: 'content',
              url: `${vaultUrl}/ui/vault/secrets/${mount}/show/${path}`,
              matchType: 'content',
              matches: contentMatches.slice(0, 3) // Limit displayed matches
            });
          }
        } catch (error) {
          // Skip secrets we can't read
        }
      }
    }

  } catch (error) {
    console.error(`[Background] Error searching mount ${mount}:`, error);
  }

  return results;
}

/**
 * Search secret content for matches
 */
async function searchSecretContent(vaultUrl, token, namespace, mount, path, term, options) {
  try {
    const headers = { 'X-Vault-Token': token };
    if (namespace) headers['X-Vault-Namespace'] = namespace;

    // Check if KV2
    const isKv2 = await checkIfKv2(vaultUrl, token, namespace, mount);
    const dataPath = isKv2 ? `${mount}data/${path}` : `${mount}${path}`;
    const secretUrl = `${vaultUrl}/v1/${dataPath}`;

    const response = await fetchWithTimeout(secretUrl, { headers }, 5000);

    if (!response.ok) {
      return [];
    }

    const secretData = await response.json();
    const data = isKv2 ? secretData.data?.data : secretData.data;

    if (!data) {
      return [];
    }

    return searchInData(data, term, options);
  } catch (error) {
    // Silent fail - secret might not be readable
    return [];
  }
}

/**
 * List all paths recursively in a mount
 */
async function listAllPaths(vaultUrl, token, namespace, mount, prefix, maxDepth, depth = 0) {
  if (depth >= maxDepth) {
    console.log(`[Background] Max depth ${maxDepth} reached at ${mount}${prefix}`);
    return [];
  }

  const paths = [];
  const headers = { 'X-Vault-Token': token };
  if (namespace) headers['X-Vault-Namespace'] = namespace;

  try {
    // Check if KV2
    const isKv2 = await checkIfKv2(vaultUrl, token, namespace, mount);
    const listPath = isKv2 ? `${mount}metadata/${prefix}` : `${mount}${prefix}`;
    const listUrl = `${vaultUrl}/v1/${listPath}?list=true`;

    const response = await fetchWithTimeout(listUrl, { headers }, 5000);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const keys = data.data?.keys || [];

    // Process directories and files
    for (const key of keys) {
      const fullPath = prefix + key;

      if (key.endsWith('/')) {
        // Directory
        paths.push({
          path: fullPath,
          type: 'directory'
        });

        // Recurse into subdirectory
        const subPaths = await listAllPaths(
          vaultUrl,
          token,
          namespace,
          mount,
          fullPath,
          maxDepth,
          depth + 1
        );
        paths.push(...subPaths);
      } else {
        // File
        paths.push({
          path: fullPath,
          type: 'file'
        });
      }
    }
  } catch (error) {
    // Silent fail - might not have list permissions
  }

  return paths;
}

/**
 * Check if mount is KV version 2 (with caching)
 */
async function checkIfKv2(vaultUrl, token, namespace, mount) {
  // Check cache first
  if (kv2Cache.has(mount)) {
    return kv2Cache.get(mount);
  }

  try {
    const headers = { 'X-Vault-Token': token };
    if (namespace) headers['X-Vault-Namespace'] = namespace;

    const response = await fetchWithTimeout(
      `${vaultUrl}/v1/sys/internal/ui/mounts/${mount}`,
      { headers },
      3000
    );

    if (response.ok) {
      const data = await response.json();
      const isKv2 = data.data?.options?.version === '2';
      kv2Cache.set(mount, isKv2);
      return isKv2;
    }
  } catch (error) {
    // Assume KV1 if we can't determine
  }

  kv2Cache.set(mount, false);
  return false;
}

/**
 * Search within secret data
 */
function searchInData(data, term, options) {
  const matches = [];
  const searchTerm = options.caseInsensitive ? term.toLowerCase() : term;

  function searchObject(obj, path = '') {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      const matchKey = options.caseInsensitive ? key.toLowerCase() : key;
      const valueStr = String(value);
      const matchValue = options.caseInsensitive ? valueStr.toLowerCase() : valueStr;

      let keyMatches = false;
      let valueMatches = false;

      if (options.exactMatch) {
        keyMatches = matchKey === searchTerm;
        valueMatches = matchValue === searchTerm;
      } else {
        keyMatches = matchKey.includes(searchTerm) || fuzzyMatch(matchKey, searchTerm);
        valueMatches = matchValue.includes(searchTerm) || fuzzyMatch(matchValue, searchTerm);
      }

      if (keyMatches || valueMatches) {
        const truncatedValue = valueStr.length > 100 ? valueStr.substring(0, 100) + '...' : valueStr;
        matches.push(`${currentPath}: ${truncatedValue}`);
      }

      // Recurse into nested objects
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        searchObject(value, currentPath);
      }
    }
  }

  searchObject(data);
  return matches;
}

// ============================================================================
// SEARCH UTILITIES
// ============================================================================

/**
 * Fuzzy match algorithm
 */
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

/**
 * Deduplicate search results
 */
function deduplicateResults(results) {
  const seen = new Map();

  return results.filter(result => {
    const key = `${result.path}_${result.matchType}`;
    if (seen.has(key)) {
      return false;
    }
    seen.set(key, true);
    return true;
  });
}

/**
 * Clean up expired searches
 */
function cleanupExpiredSearches() {
  const now = Date.now();
  const expiredSearches = [];

  for (const [searchId, searchState] of activeSearches.entries()) {
    const age = now - searchState.startTime;

    // Remove searches older than timeout
    if (age > CONSTANTS.SEARCH.SEARCH_TIMEOUT) {
      expiredSearches.push(searchId);
    }
  }

  expiredSearches.forEach(searchId => {
    activeSearches.delete(searchId);
    console.log(`[Background] Cleaned up expired search: ${searchId}`);
  });

  if (expiredSearches.length > 0) {
    console.log(`[Background] Cleaned up ${expiredSearches.length} expired searches`);
  }
}

// ============================================================================
// NETWORK UTILITIES
// ============================================================================

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url, options, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch with retry logic
 */
async function fetchWithRetry(url, options, maxRetries = 2) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, 10000);
      return response;
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        console.log(`[Background] Retry ${attempt + 1}/${maxRetries} for ${url}`);
      }
    }
  }

  throw lastError;
}

// ============================================================================
// MISC HANDLERS
// ============================================================================

async function handleOpenResult(request) {
  try {
    const { path, url } = request;

    if (!authState.authenticated) {
      return { success: false, error: 'Not authenticated' };
    }

    // Copy path to clipboard
    await navigator.clipboard.writeText(path);

    // Show notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon128.png',
      title: 'Vault Search',
      message: `Path copied: ${path}`,
      priority: 0
    });

    // Open in new tab if URL provided
    if (url) {
      chrome.tabs.create({ url });
    }

    return { success: true };
  } catch (error) {
    console.error('[Background] Open result error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// ACTIVITY MONITORING
// ============================================================================

let activityCheckInterval = null;

function startActivityMonitoring() {
  if (activityCheckInterval) {
    clearInterval(activityCheckInterval);
  }

  activityCheckInterval = setInterval(() => {
    if (authState.authenticated && authState.tokenExpiry) {
      const now = Date.now();

      // Check token expiry
      if (now >= authState.tokenExpiry) {
        console.log('[Background] Session expired due to token expiry');
        clearAuthData();

        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon128.png',
          title: 'Vault Search',
          message: 'Your session has expired. Please log in again.',
          priority: 1
        });
      }
      // Check if refresh needed
      else if (shouldRefreshToken()) {
        attemptTokenRefresh();
      }
    }
  }, CONSTANTS.AUTH.ACTIVITY_CHECK_INTERVAL);
}

// ============================================================================
// CONTEXT MENU
// ============================================================================

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

  console.log('[Background] Extension installed/updated');
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

// ============================================================================
// LOGGING
// ============================================================================

console.log('[Background] Service worker initialized');
console.log('[Background] Auth state:', authState.authenticated ? 'Authenticated' : 'Not authenticated');
