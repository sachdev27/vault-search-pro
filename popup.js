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

let currentAuthType = 'token';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupEventListeners();
  checkConnectionStatus();
});

// Setup event listeners
function setupEventListeners() {
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

  // Enter key to save
  document.querySelectorAll('input').forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleSave();
      }
    });
  });
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

    // Close popup after 1.5 seconds
    setTimeout(() => {
      window.close();
    }, 1500);

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
  } else {
    connectionDot.classList.remove('connected');
    connectionText.textContent = 'Not connected';
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
