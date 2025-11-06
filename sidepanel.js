/**
 * Vault Search Pro - Side Panel Logic
 * Version: 2.3.0
 * Author: Sandesh Sachdev
 */

// State
let currentSearchId = null;
let pollInterval = null;
let isConnected = false;
let activeSessions = [];

// DOM Elements
const elements = {
  // Tabs
  tabButtons: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),

  // Connection
  connectionBadge: document.getElementById('connection-badge'),
  connectionText: document.getElementById('connection-text'),

  // Search
  searchInput: document.getElementById('search-input'),
  searchBtn: document.getElementById('search-btn'),
  caseSensitiveCheck: document.getElementById('case-sensitive'),
  includeDirsCheck: document.getElementById('include-directories'),
  statusBar: document.getElementById('status-bar'),
  resultsCount: document.getElementById('results-count'),
  resultsContainer: document.getElementById('results-container'),

  // Settings - Token Auth
  tokenUrlInput: document.getElementById('token-url'),
  tokenInput: document.getElementById('token'),
  tokenConnectBtn: document.getElementById('token-connect'),
  tokenDisconnectBtn: document.getElementById('token-disconnect'),
  tokenStatusMessage: document.getElementById('token-status-message'),

  // Settings - UserPass Auth
  userpassUrlInput: document.getElementById('userpass-url'),
  usernameInput: document.getElementById('username'),
  passwordInput: document.getElementById('password'),
  userpassConnectBtn: document.getElementById('userpass-connect'),
  userpassDisconnectBtn: document.getElementById('userpass-disconnect'),
  userpassStatusMessage: document.getElementById('userpass-status-message'),

  // Settings - LDAP Auth
  ldapUrlInput: document.getElementById('ldap-url'),
  ldapUsernameInput: document.getElementById('ldap-username'),
  ldapPasswordInput: document.getElementById('ldap-password'),
  ldapConnectBtn: document.getElementById('ldap-connect'),
  ldapDisconnectBtn: document.getElementById('ldap-disconnect'),
  ldapStatusMessage: document.getElementById('ldap-status-message'),

  // Sessions
  sessionsList: document.getElementById('sessions-list'),

  // Header
  minimizeBtn: document.getElementById('minimize-btn'),
  closeBtn: document.getElementById('close-btn'),

  // Minimized
  panelContainer: document.getElementById('panel-container'),
  panelMinimized: document.getElementById('panel-minimized'),
  expandBtn: document.getElementById('expand-btn'),
  minimizedBadge: document.getElementById('minimized-badge')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeTabs();
  initializeAuthTabs();
  checkConnectionStatus();
  checkForActiveSearch();
  attachEventListeners();
});

// Tab Management
function initializeTabs() {
  elements.tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.dataset.tab;

      // Update buttons
      elements.tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      // Update content
      elements.tabContents.forEach(content => {
        if (content.id === targetTab) {
          content.classList.add('active');
        } else {
          content.classList.remove('active');
        }
      });

      // Refresh sessions list when switching to sessions tab
      if (targetTab === 'sessions-tab') {
        renderSessions();
      }
    });
  });
}

// Auth Tabs Management
function initializeAuthTabs() {
  const authTabButtons = document.querySelectorAll('.auth-tab');
  const authPanels = document.querySelectorAll('.auth-panel');

  authTabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetPanel = button.dataset.auth;

      // Update buttons
      authTabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      // Update panels
      authPanels.forEach(panel => {
        if (panel.id === targetPanel + '-panel') {
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
        }
      });
    });
  });
}

// Event Listeners
function attachEventListeners() {
  // Search
  elements.searchBtn.addEventListener('click', handleSearch);
  elements.searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });

  // Token Auth
  elements.tokenConnectBtn.addEventListener('click', () => handleConnect('token'));
  elements.tokenDisconnectBtn.addEventListener('click', handleDisconnect);

  // UserPass Auth
  elements.userpassConnectBtn.addEventListener('click', () => handleConnect('userpass'));
  elements.userpassDisconnectBtn.addEventListener('click', handleDisconnect);

  // LDAP Auth
  elements.ldapConnectBtn.addEventListener('click', () => handleConnect('ldap'));
  elements.ldapDisconnectBtn.addEventListener('click', handleDisconnect);

  // Panel Controls
  elements.minimizeBtn.addEventListener('click', minimizePanel);
  elements.closeBtn.addEventListener('click', closePanel);
  elements.expandBtn.addEventListener('click', expandPanel);
}

// Connection Status
async function checkConnectionStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'CHECK_CONNECTION' });

    if (response.connected) {
      updateConnectionStatus(true, response.vaultUrl);
    } else {
      updateConnectionStatus(false);
    }
  } catch (error) {
    console.error('Failed to check connection:', error);
    updateConnectionStatus(false);
  }
}

function updateConnectionStatus(connected, url = '') {
  isConnected = connected;

  if (connected) {
    elements.connectionBadge.classList.add('connected');
    elements.connectionText.textContent = `Connected to ${url}`;
  } else {
    elements.connectionBadge.classList.remove('connected');
    elements.connectionText.textContent = 'Not Connected';
  }

  // Update button states
  updateButtonStates();
}

function updateButtonStates() {
  elements.searchBtn.disabled = !isConnected;

  // Token auth
  elements.tokenConnectBtn.style.display = isConnected ? 'none' : 'block';
  elements.tokenDisconnectBtn.style.display = isConnected ? 'block' : 'none';

  // UserPass auth
  elements.userpassConnectBtn.style.display = isConnected ? 'none' : 'block';
  elements.userpassDisconnectBtn.style.display = isConnected ? 'block' : 'none';

  // LDAP auth
  elements.ldapConnectBtn.style.display = isConnected ? 'none' : 'block';
  elements.ldapDisconnectBtn.style.display = isConnected ? 'block' : 'none';
}

// Authentication
async function handleConnect(authType) {
  let authData = {};
  let statusElement = null;

  if (authType === 'token') {
    authData = {
      type: 'AUTH_TOKEN',
      vaultUrl: elements.tokenUrlInput.value.trim(),
      token: elements.tokenInput.value.trim()
    };
    statusElement = elements.tokenStatusMessage;
  } else if (authType === 'userpass') {
    authData = {
      type: 'AUTH_USERPASS',
      vaultUrl: elements.userpassUrlInput.value.trim(),
      username: elements.usernameInput.value.trim(),
      password: elements.passwordInput.value
    };
    statusElement = elements.userpassStatusMessage;
  } else if (authType === 'ldap') {
    authData = {
      type: 'AUTH_LDAP',
      vaultUrl: elements.ldapUrlInput.value.trim(),
      username: elements.ldapUsernameInput.value.trim(),
      password: elements.ldapPasswordInput.value
    };
    statusElement = elements.ldapStatusMessage;
  }

  // Validate
  if (!authData.vaultUrl) {
    showStatusMessage(statusElement, 'error', 'Vault URL is required');
    return;
  }

  showStatusMessage(statusElement, 'info', 'Connecting...');

  try {
    const response = await chrome.runtime.sendMessage(authData);

    if (response.success) {
      showStatusMessage(statusElement, 'success', 'Connected successfully!');
      updateConnectionStatus(true, authData.vaultUrl);

      // Clear sensitive fields
      if (authType === 'token') {
        elements.tokenInput.value = '';
      } else if (authType === 'userpass') {
        elements.passwordInput.value = '';
      } else if (authType === 'ldap') {
        elements.ldapPasswordInput.value = '';
      }
    } else {
      showStatusMessage(statusElement, 'error', response.error || 'Connection failed');
    }
  } catch (error) {
    showStatusMessage(statusElement, 'error', `Error: ${error.message}`);
  }
}

async function handleDisconnect() {
  try {
    await chrome.runtime.sendMessage({ type: 'DISCONNECT' });
    updateConnectionStatus(false);

    // Clear all status messages
    [elements.tokenStatusMessage, elements.userpassStatusMessage, elements.ldapStatusMessage].forEach(el => {
      el.style.display = 'none';
    });
  } catch (error) {
    console.error('Disconnect error:', error);
  }
}

function showStatusMessage(element, type, message) {
  element.textContent = message;
  element.className = `status-message ${type}`;
  element.style.display = 'block';
}

// Search
async function handleSearch() {
  const searchTerm = elements.searchInput.value.trim();

  if (!searchTerm) {
    showSearchStatus('error', 'Please enter a search term');
    return;
  }

  if (!isConnected) {
    showSearchStatus('error', 'Not connected to Vault');
    return;
  }

  // Clear previous results
  elements.resultsContainer.innerHTML = '';
  elements.resultsCount.textContent = '0';
  showSearchStatus('info', 'Searching...');

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'START_SEARCH',
      query: searchTerm,
      options: {
        caseSensitive: elements.caseSensitiveCheck.checked,
        includeDirectories: elements.includeDirsCheck.checked
      }
    });

    if (response.success) {
      currentSearchId = response.searchId;

      // Add to sessions
      activeSessions.push({
        id: response.searchId,
        term: searchTerm,
        status: 'running',
        startTime: Date.now(),
        results: 0
      });

      updateMinimizedBadge();

      // Start polling
      startPolling();
    } else {
      showSearchStatus('error', response.error || 'Search failed');
    }
  } catch (error) {
    showSearchStatus('error', `Error: ${error.message}`);
  }
}

function startPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
  }

  pollInterval = setInterval(async () => {
    if (!currentSearchId) {
      stopPolling();
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_SEARCH_RESULTS',
        searchId: currentSearchId
      });

      if (response.success) {
        updateSearchResults(response.results, response.status);

        if (response.status === 'completed') {
          stopPolling();
          updateSessionStatus(currentSearchId, 'completed', response.results.length);
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
      stopPolling();
    }
  }, 1000);
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

function updateSearchResults(results, status) {
  elements.resultsCount.textContent = results.length;

  if (status === 'searching') {
    showSearchStatus('info', `Searching... ${results.length} results found`);
  } else if (status === 'completed') {
    showSearchStatus('success', `Search completed - ${results.length} results found`);
  }

  // Render results
  if (results.length === 0 && status === 'completed') {
    elements.resultsContainer.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <p>No results found</p>
      </div>
    `;
  } else {
    elements.resultsContainer.innerHTML = results.map(result => createResultElement(result)).join('');

    // Attach click handlers
    document.querySelectorAll('.result-item').forEach(item => {
      item.addEventListener('click', () => openResult(item.dataset.path, item.dataset.type));
    });
  }
}

function createResultElement(result) {
  const isDirectory = result.isDirectory || result.type === 'directory';
  const icon = isDirectory ? '📁' : '📄';
  const badgeClass = isDirectory ? 'directory' : 'content';
  const badgeText = isDirectory ? 'dir' : 'path';

  let matchInfo = '';
  if (result.matches && result.matches.length > 0) {
    matchInfo = `<div class="result-matches">${result.matches.length} match${result.matches.length > 1 ? 'es' : ''} in content</div>`;
  }

  return `
    <div class="result-item" data-path="${result.path}" data-type="${isDirectory ? 'directory' : 'secret'}">
      <div class="result-header">
        <span class="result-icon">${icon}</span>
        <span class="result-path">${result.path}</span>
        <span class="result-badge ${badgeClass}">${badgeText}</span>
      </div>
      ${matchInfo}
    </div>
  `;
}

async function openResult(path, type) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'OPEN_RESULT',
      path,
      resultType: type
    });

    if (!response.success) {
      showSearchStatus('error', response.error || 'Failed to open result');
    }
  } catch (error) {
    showSearchStatus('error', `Error: ${error.message}`);
  }
}

function showSearchStatus(type, message) {
  elements.statusBar.textContent = message;
  elements.statusBar.className = `status-bar ${type}`;
}

// Check for Active Search on Load
async function checkForActiveSearch() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_ACTIVE_SEARCH' });

    if (response.success && response.searchId) {
      currentSearchId = response.searchId;
      elements.searchInput.value = response.query || '';

      // Resume polling
      startPolling();
    }
  } catch (error) {
    console.error('Failed to check active search:', error);
  }
}

// Sessions Management
function renderSessions() {
  if (activeSessions.length === 0) {
    elements.sessionsList.innerHTML = `
      <div class="empty-state">
        <p>No active sessions</p>
      </div>
    `;
    return;
  }

  elements.sessionsList.innerHTML = activeSessions.map(session => `
    <div class="session-item">
      <div class="session-header">
        <span class="session-term">"${session.term}"</span>
        <span class="session-status ${session.status}">${session.status}</span>
      </div>
      <div class="session-progress">
        ${session.results} results • ${formatTime(Date.now() - session.startTime)}
      </div>
    </div>
  `).join('');
}

function updateSessionStatus(searchId, status, resultCount) {
  const session = activeSessions.find(s => s.id === searchId);
  if (session) {
    session.status = status;
    session.results = resultCount;
  }
  updateMinimizedBadge();
}

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

// Panel Controls
function minimizePanel() {
  elements.panelContainer.style.display = 'none';
  elements.panelMinimized.style.display = 'block';
}

function expandPanel() {
  elements.panelContainer.style.display = 'flex';
  elements.panelMinimized.style.display = 'none';
}

function closePanel() {
  window.close();
}

function updateMinimizedBadge() {
  const runningCount = activeSessions.filter(s => s.status === 'running').length;

  if (runningCount > 0) {
    elements.minimizedBadge.textContent = runningCount;
    elements.minimizedBadge.style.display = 'block';
  } else {
    elements.minimizedBadge.style.display = 'none';
  }
}
