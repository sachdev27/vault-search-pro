/**
 * Vault Search Extension - Background Service Worker
 * Author: Sandesh Sachdev
 * Version: 2.0.0
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

// Constants
const TOKEN_EXPIRY_TIME = 12 * 60 * 60 * 1000; // 12 hours
const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // 1 minute

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
      handleStoreAuth(request.data);
      sendResponse({ success: true });
      break;

    case 'GET_AUTH':
      sendResponse(getAuthData());
      break;

    case 'CHECK_AUTH':
      sendResponse({ authenticated: authState.authenticated });
      break;

    case 'CLEAR_AUTH':
      clearAuthData();
      sendResponse({ success: true });
      break;

    case 'REFRESH_TOKEN':
      handleRefreshToken(request.data).then(result => {
        sendResponse(result);
      });
      return true; // Keep message channel open for async response

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
function handleStoreAuth(data) {
  authState = {
    vaultUrl: data.vaultUrl,
    namespace: data.namespace,
    token: data.token,
    authType: data.authType,
    authenticated: true,
    lastActivity: Date.now()
  };

  console.log('[Vault Search] Auth stored successfully');

  // Set badge to indicate active connection
  chrome.action.setBadgeText({ text: '✓' });
  chrome.action.setBadgeBackgroundColor({ color: '#10b981' });

  // Start activity monitoring
  startActivityMonitoring();
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

  return {
    authenticated: true,
    vaultUrl: authState.vaultUrl,
    namespace: authState.namespace,
    token: authState.token,
    authType: authState.authType
  };
}

// Clear authentication data
function clearAuthData() {
  authState = {
    vaultUrl: null,
    namespace: null,
    token: null,
    authType: null,
    authenticated: false,
    lastActivity: null
  };

  chrome.action.setBadgeText({ text: '' });
  console.log('[Vault Search] Auth cleared');
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

// Handle extension icon click
chrome.action.onClicked.addListener(() => {
  chrome.action.openPopup();
});

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
