// Demo Page Interactive Functionality
document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const mainTabs = document.querySelectorAll('.main-tab');
  const tabContents = document.querySelectorAll('.tab-content');
  const searchBtn = document.getElementById('search-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const searchTermInput = document.getElementById('search-term');
  const caseSensitiveCheckbox = document.getElementById('case-sensitive');
  const exactMatchCheckbox = document.getElementById('exact-match');
  const statusMessage = document.getElementById('status-message');
  const resultsSection = document.getElementById('results-section');
  const resultsList = document.getElementById('results-list');
  const resultsCount = document.getElementById('results-count');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const testConnectionBtn = document.getElementById('test-connection-btn');

  // State
  let isSearching = false;
  let searchInterval = null;
  let resultCount = 0;

  // Sample Vault paths for demo
  const samplePaths = [
    'secret/data/production/database/postgres',
    'kv/team-app/api-keys/stripe',
    'secret/staging/auth/jwt-secret',
    'kv/data/config/app-settings',
    'secret/prod/db/root-password',
    'kv/analytics/warehouse-credentials',
    'secret/data/services/redis/password',
    'kv/team-platform/slack-webhook',
    'secret/prod/aws/access-keys',
    'kv/data/microservices/auth/database',
    'secret/staging/mongodb/admin-password',
    'kv/team-devops/github-token',
    'secret/prod/elasticsearch/credentials',
    'kv/data/billing/stripe-secret-key',
    'secret/staging/rabbitmq/admin',
    'kv/team-data/snowflake-credentials',
    'secret/prod/kubernetes/service-account',
    'kv/data/monitoring/grafana-api-key',
    'secret/staging/vault/root-token',
    'kv/team-security/ssl-certificates'
  ];

  const matchTypes = ['path', 'value', 'key'];
  const timeAgo = ['2m ago', '5m ago', '12m ago', '1h ago', '3h ago', '1d ago'];

  // Tab Switching
  mainTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;

      // Update active states
      mainTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `${targetTab}-tab`) {
          content.classList.add('active');
        }
      });
    });
  });

  // Search Functionality
  searchBtn.addEventListener('click', startSearch);
  cancelBtn.addEventListener('click', cancelSearch);

  searchTermInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !isSearching) {
      startSearch();
    }
  });

  function startSearch() {
    const searchTerm = searchTermInput.value.trim();

    if (!searchTerm) {
      showStatus('Please enter a search term', 'error');
      return;
    }

    isSearching = true;
    resultCount = 0;
    resultsList.innerHTML = '';

    // Update UI
    searchBtn.classList.add('hidden');
    cancelBtn.classList.remove('hidden');
    searchTermInput.disabled = true;
    caseSensitiveCheckbox.disabled = true;
    exactMatchCheckbox.disabled = true;

    showStatus(`Searching for "${searchTerm}"...`, 'info');
    resultsSection.classList.remove('hidden');

    // Simulate streaming results
    let pathsToSearch = [...samplePaths];
    const caseSensitive = caseSensitiveCheckbox.checked;
    const exactMatch = exactMatchCheckbox.checked;

    // Filter paths based on search options
    pathsToSearch = pathsToSearch.filter(path => {
      const pathLower = caseSensitive ? path : path.toLowerCase();
      const termLower = caseSensitive ? searchTerm : searchTerm.toLowerCase();

      if (exactMatch) {
        return path.includes(searchTerm);
      } else {
        return pathLower.includes(termLower);
      }
    });

    // Shuffle for realistic streaming
    pathsToSearch.sort(() => Math.random() - 0.5);

    let index = 0;
    searchInterval = setInterval(() => {
      if (index < pathsToSearch.length && isSearching) {
        addResult(pathsToSearch[index]);
        index++;

        // Update status
        showStatus(`Found ${resultCount} result${resultCount !== 1 ? 's' : ''}...`, 'info');
      } else {
        completeSearch();
      }
    }, 400 + Math.random() * 600); // Random delay between 400-1000ms
  }

  function addResult(path) {
    resultCount++;

    const resultItem = document.createElement('div');
    resultItem.className = 'result-item';

    const matchType = matchTypes[Math.floor(Math.random() * matchTypes.length)];
    const time = timeAgo[Math.floor(Math.random() * timeAgo.length)];

    resultItem.innerHTML = `
      <div class="result-path">${path}</div>
      <div class="result-meta">
        <span class="result-type">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
          Match: ${matchType}
        </span>
        <span>Updated ${time}</span>
      </div>
    `;

    resultItem.addEventListener('click', () => {
      showStatus(`Copied path: ${path}`, 'success');
      setTimeout(() => {
        statusMessage.classList.remove('show');
      }, 2000);
    });

    resultsList.appendChild(resultItem);
    resultsCount.textContent = `${resultCount} found`;

    // Scroll to latest result
    resultItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function completeSearch() {
    clearInterval(searchInterval);
    isSearching = false;

    // Update UI
    searchBtn.classList.remove('hidden');
    cancelBtn.classList.add('hidden');
    searchTermInput.disabled = false;
    caseSensitiveCheckbox.disabled = false;
    exactMatchCheckbox.disabled = false;

    if (resultCount > 0) {
      showStatus(`Search complete! Found ${resultCount} result${resultCount !== 1 ? 's' : ''}.`, 'success');
    } else {
      showStatus('No results found. Try a different search term.', 'error');
      resultsSection.classList.add('hidden');
    }
  }

  function cancelSearch() {
    clearInterval(searchInterval);
    isSearching = false;

    // Update UI
    searchBtn.classList.remove('hidden');
    cancelBtn.classList.add('hidden');
    searchTermInput.disabled = false;
    caseSensitiveCheckbox.disabled = false;
    exactMatchCheckbox.disabled = false;

    showStatus(`Search cancelled. Found ${resultCount} result${resultCount !== 1 ? 's' : ''} before stopping.`, 'info');
  }

  function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = `status-message show ${type}`;
  }

  // Settings Functionality
  saveSettingsBtn.addEventListener('click', () => {
    showStatus('Settings saved successfully!', 'success');

    // Animate button
    saveSettingsBtn.textContent = '✓ Saved!';
    saveSettingsBtn.classList.add('disabled');

    setTimeout(() => {
      saveSettingsBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          <polyline points="17 21 17 13 7 13 7 21"></polyline>
          <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
        Save Settings
      `;
      saveSettingsBtn.classList.remove('disabled');
    }, 2000);
  });

  testConnectionBtn.addEventListener('click', () => {
    const originalText = testConnectionBtn.innerHTML;
    testConnectionBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="loading">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
      </svg>
      Testing...
    `;
    testConnectionBtn.classList.add('disabled');

    setTimeout(() => {
      showStatus('Connection successful! ✓', 'success');
      testConnectionBtn.innerHTML = originalText;
      testConnectionBtn.classList.remove('disabled');

      setTimeout(() => {
        statusMessage.classList.remove('show');
      }, 3000);
    }, 2000);
  });

  // Add some demo hints
  const hints = [
    'Try searching for "database", "api", "password", or "secret"',
    'Toggle case-sensitive to see how it affects results',
    'Use exact match to find only perfect matches',
    'Click on any result to simulate copying the path',
    'Switch to Settings tab to see the configuration options'
  ];

  let hintIndex = 0;
  const showNextHint = () => {
    if (!isSearching && !searchTermInput.value) {
      searchTermInput.placeholder = hints[hintIndex];
      hintIndex = (hintIndex + 1) % hints.length;
    }
  };

  // Rotate hints every 4 seconds
  setInterval(showNextHint, 4000);
  showNextHint();

  // Add some example searches on first load
  setTimeout(() => {
    if (!searchTermInput.value) {
      const exampleSearches = ['database', 'api-key', 'password', 'secret'];
      const randomSearch = exampleSearches[Math.floor(Math.random() * exampleSearches.length)];
      searchTermInput.value = randomSearch;
      searchTermInput.focus();

      // Pulse the search button
      searchBtn.style.animation = 'pulse 2s ease infinite';
      setTimeout(() => {
        searchBtn.style.animation = '';
      }, 4000);
    }
  }, 1000);
});

// Add pulse animation
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
      box-shadow: 0 4px 12px rgba(93, 93, 255, 0.3);
    }
    50% {
      transform: scale(1.02);
      box-shadow: 0 6px 20px rgba(93, 93, 255, 0.5);
    }
  }
`;
document.head.appendChild(style);
