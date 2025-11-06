# Installation Guide

## Table of Contents
- [Prerequisites](#prerequisites)
- [Installation Methods](#installation-methods)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- **Google Chrome** version 88 or higher
- **HashiCorp Vault** server with KV secrets engine enabled
- Valid Vault credentials (token, userpass, or LDAP)

## Installation Methods

### Method 1: Chrome Web Store (Recommended)

1. Visit the [Chrome Web Store](https://chrome.google.com/webstore) (coming soon)
2. Search for "Vault Search Pro"
3. Click "Add to Chrome"
4. Click "Add extension" when prompted
5. Pin the extension to your toolbar for easy access

### Method 2: Manual Installation (Developer Mode)

#### Step 1: Download Extension

**Option A: Clone from GitHub**
```bash
git clone https://github.com/sandeshsachdev/vault-search-pro.git
cd vault-search-pro
```

**Option B: Download ZIP**
1. Go to https://github.com/sandeshsachdev/vault-search-pro
2. Click "Code" → "Download ZIP"
3. Extract the ZIP file

#### Step 2: Install in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle switch in top-right corner)
3. Click **"Load unpacked"** button
4. Navigate to and select the extension directory
5. The extension should now appear in your extensions list

#### Step 3: Pin Extension

1. Click the **puzzle piece icon** (🧩) in Chrome toolbar
2. Find **"Vault Search Pro"** in the list
3. Click the **pin icon** (📌) to pin it to your toolbar

## Configuration

### First-Time Setup

1. **Click the Extension Icon** in your Chrome toolbar

2. **Enter Vault Server URL**:
   - Example: `https://vault.example.com`
   - Must include protocol (https:// or http://)
   - Do not include `/ui/` path

3. **Optional: Enter Namespace**:
   - Example: `admin/team`
   - Leave blank if not using namespaces

4. **Choose Authentication Method**:

   **Option A: Token Authentication**
   - Click the "Token" tab
   - Paste your Vault token
   - Token format: `hvs.CAESIJ...` or similar

   **Option B: UserPass (Basic Auth)**
   - Click the "Basic Auth" tab
   - Enter your username
   - Enter your password
   - Verify mount path (default: `userpass`)

   **Option C: LDAP**
   - Click the "LDAP" tab
   - Enter your LDAP username
   - Enter your LDAP password
   - Verify mount path (default: `ldap`)

5. **Enable Remember Me** (Optional):
   - Check "Remember my credentials"
   - Note: Passwords are never saved for security

6. **Click "Save & Connect"**:
   - Extension will test the connection
   - Success message will appear
   - Popup will close automatically

### Obtaining Vault Credentials

#### Getting a Token

**Method 1: Vault UI**
```
1. Log into Vault UI
2. Click your user icon (top right)
3. Click "Copy token"
4. Paste into extension
```

**Method 2: Vault CLI**
```bash
vault login -method=userpass username=myuser
# Token will be displayed
```

**Method 3: API**
```bash
curl -X POST https://vault.example.com/v1/auth/userpass/login/myuser \
  -d '{"password":"mypassword"}' | jq -r .auth.client_token
```

#### UserPass Setup

Your Vault admin needs to enable userpass auth:
```bash
vault auth enable userpass
vault write auth/userpass/users/myuser password=mypassword policies=default
```

#### LDAP Setup

Your Vault admin needs to enable LDAP auth:
```bash
vault auth enable ldap
vault write auth/ldap/config url="ldap://ldap.example.com" ...
```

## Usage

### Opening Search

**Method 1: Floating Button**
- Visit any page (or Vault UI)
- Click "Search Vault" button (top-right)

**Method 2: Keyboard Shortcut**
- Press `Ctrl + Shift + K` (Windows/Linux)
- Press `Cmd + Shift + K` (Mac)

**Method 3: Extension Icon**
- Click extension icon
- Settings will open (configure if needed)
- Then use Method 1 or 2

### Basic Search

1. Enter search term (e.g., "password")
2. Click "Search" or press Enter
3. Results stream in real-time
4. Click "Open in UI" to view full secret

### Advanced Search

**Filters:**
- **Mount filter**: Search only specific mount (e.g., `secret/`)
- **Prefix filter**: Search only specific path prefix (e.g., `prod/`)

**Search Modes:**
- **Contains**: Partial match (default)
- **Exact**: Exact match only
- **Regex**: Regular expression pattern
- **Fuzzy**: Similarity-based (typo-tolerant)

**Performance Tuning:**
- **Workers**: Number of concurrent requests (8-64, default: 48)
- **Max depth**: JSON traversal depth (1-50, default: 10)

## Troubleshooting

### Extension Not Loading

**Problem**: Extension doesn't appear after installation

**Solutions**:
1. Refresh the `chrome://extensions/` page
2. Ensure "Developer mode" is enabled
3. Check for error messages in red
4. Try removing and re-adding the extension

### Connection Failed

**Problem**: "Authentication failed" or "Connection error"

**Solutions**:
1. Verify Vault URL is correct (include https://)
2. Check credentials are valid
3. Ensure Vault server is accessible
4. Check firewall/proxy settings
5. Verify auth method is enabled in Vault
6. Test connection with curl:
   ```bash
   curl https://your-vault.com/v1/sys/health
   ```

### Token Expired

**Problem**: "Token expired" or "Permission denied"

**Solutions**:
1. Click extension icon to re-authenticate
2. Generate new token from Vault
3. Check token TTL: `vault token lookup`
4. Use renewable token if needed

### No Results Found

**Problem**: Search returns no results

**Solutions**:
1. Verify you have read permissions
2. Check mount/prefix filters aren't too restrictive
3. Try broader search term
4. Verify secrets exist at expected paths
5. Check namespace is correct (if using)

### Performance Issues

**Problem**: Search is slow or times out

**Solutions**:
1. Reduce worker count (try 16-24)
2. Add mount filter to narrow scope
3. Add prefix filter to limit paths
4. Check Vault server performance
5. Reduce max depth if secrets are deeply nested

### Browser Console Errors

**Problem**: Errors appear in browser console

**Solutions**:
1. Press F12 to open DevTools
2. Go to Console tab
3. Look for errors in red
4. Check for CSP violations
5. Report persistent errors on GitHub

### Permissions Denied

**Problem**: Can't access certain secrets

**Solutions**:
1. Check your Vault policies
2. Verify token capabilities: `vault token capabilities <path>`
3. Contact Vault admin for proper permissions
4. Ensure correct namespace is selected

## Updating the Extension

### Chrome Web Store Version

Updates are automatic. Chrome will update the extension in the background.

### Manual Installation

1. Download latest version
2. Go to `chrome://extensions/`
3. Remove old version
4. Load new version using "Load unpacked"
5. Re-configure if necessary

## Uninstalling

1. Go to `chrome://extensions/`
2. Find "Vault Search Pro"
3. Click "Remove"
4. Confirm removal

All stored settings and credentials will be deleted.

## Getting Help

- **Documentation**: See main [README.md](README.md)
- **Issues**: [GitHub Issues](https://github.com/sandeshsachdev/vault-search-pro/issues)
- **Discussions**: [GitHub Discussions](https://github.com/sandeshsachdev/vault-search-pro/discussions)

---

**Author**: Sandesh Sachdev
**License**: MIT
