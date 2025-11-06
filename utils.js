/**
 * Vault Search Extension - Utilities
 * Author: Sandesh Sachdev
 * Version: 2.0.0
 *
 * Common utility functions for validation, sanitization, and helpers
 */

// Validation utilities
export const Validators = {
  /**
   * Validate URL format
   */
  isValidUrl(url) {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  },

  /**
   * Validate Vault token format
   */
  isValidToken(token) {
    if (!token || typeof token !== 'string') return false;
    // Vault tokens are typically alphanumeric with hyphens, underscores, and dots
    return /^[A-Za-z0-9\-_.]{16,}$/.test(token);
  },

  /**
   * Validate namespace format
   */
  isValidNamespace(namespace) {
    if (!namespace) return true; // Optional field
    // Namespaces can contain alphanumeric, hyphens, underscores, and slashes
    return /^[A-Za-z0-9\-_/]+$/.test(namespace);
  },

  /**
   * Validate mount path
   */
  isValidMountPath(path) {
    if (!path) return false;
    return /^[A-Za-z0-9\-_]+$/.test(path);
  }
};

// Sanitization utilities
export const Sanitizers = {
  /**
   * Sanitize HTML to prevent XSS
   */
  sanitizeHtml(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  },

  /**
   * Sanitize path to prevent path traversal
   */
  sanitizePath(path) {
    if (!path) return '';
    // Remove any path traversal attempts
    return path.replace(/\.\./g, '').replace(/\/\//g, '/');
  },

  /**
   * Truncate long strings for display
   */
  truncate(str, maxLength = 100) {
    if (!str || str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
  }
};

// Error handling utilities
export class VaultError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'VaultError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

export const ErrorCodes = {
  AUTH_FAILED: 'AUTH_FAILED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NOT_FOUND: 'NOT_FOUND',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN: 'UNKNOWN'
};

// Retry logic with exponential backoff
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    shouldRetry = (error) => true
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }

  throw lastError;
}

// Rate limiting
export class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  canMakeRequest() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    return this.requests.length < this.maxRequests;
  }

  recordRequest() {
    this.requests.push(Date.now());
  }

  async throttle() {
    if (!this.canMakeRequest()) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (Date.now() - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.recordRequest();
  }
}

// Debounce function
export function debounce(func, wait) {
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

// Throttle function
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Deep clone object
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (obj instanceof Object) {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
}

// Format bytes to human readable
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Format duration
export function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

// Parse response errors
export function parseVaultError(response, defaultMessage = 'Unknown error') {
  try {
    if (response.errors && Array.isArray(response.errors)) {
      return response.errors.join(', ');
    }
    if (response.error) {
      return response.error;
    }
    return defaultMessage;
  } catch {
    return defaultMessage;
  }
}

// Logger with levels
export class Logger {
  constructor(prefix = '[Vault Search]') {
    this.prefix = prefix;
    this.enabled = true;
  }

  debug(...args) {
    if (this.enabled) {
      console.debug(this.prefix, ...args);
    }
  }

  info(...args) {
    if (this.enabled) {
      console.info(this.prefix, ...args);
    }
  }

  warn(...args) {
    if (this.enabled) {
      console.warn(this.prefix, ...args);
    }
  }

  error(...args) {
    if (this.enabled) {
      console.error(this.prefix, ...args);
    }
  }
}

// Export to CSV
export function exportToCSV(data, filename = 'vault-search-results.csv') {
  const headers = Object.keys(data[0] || {});
  const csv = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        return `"${stringValue.replace(/"/g, '""')}"`;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export to JSON
export function exportToJSON(data, filename = 'vault-search-results.json') {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Copy to clipboard
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

// Storage helpers
export const Storage = {
  async get(keys) {
    return new Promise((resolve) => {
      chrome.storage.sync.get(keys, resolve);
    });
  },

  async set(items) {
    return new Promise((resolve) => {
      chrome.storage.sync.set(items, resolve);
    });
  },

  async remove(keys) {
    return new Promise((resolve) => {
      chrome.storage.sync.remove(keys, resolve);
    });
  },

  async clear() {
    return new Promise((resolve) => {
      chrome.storage.sync.clear(resolve);
    });
  }
};
