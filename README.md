# 🔐 Vault Search Pro

[![Version](https://img.shields.io/badge/version-2.3.0-blue.svg)](https://github.com/sandeshsachdev/vault-search-extension)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Chrome](https://img.shields.io/badge/chrome-extension-orange.svg)](https://chrome.google.com/webstore)

> **Production-grade Chrome extension with industry-standard persistent UI for HashiCorp Vault secret search**

A powerful, enterprise-ready Chrome extension that provides lightning-fast search capabilities for HashiCorp Vault with **persistent Side Panel UI**, multi-auth support, intelligent path scanning, and deep value search.

**Created by [Sandesh Sachdev](https://github.com/sandeshsachdev)**

---

## ✨ Features

### 🎯 Side Panel UI (NEW in v2.3.0)
- **�️ Industry-Grade Persistent Interface**
  - Never disappears when clicking outside (unlike popups)
  - Dockable panel that stays visible across tabs
  - Background search continues even when minimized
  - Session tracking for multiple searches
  - Minimize/expand controls for workflow flexibility
  - Professional developer experience

### �🚀 Core Capabilities
- **⚡ Two-Phase Search Engine**
  - Phase A: Ultra-fast path-only scanning (instant results)
  - Phase B: Deep value search on candidate paths
  - Streams results to UI in real-time

- **🔑 Multiple Authentication Methods**
  - **Token-based auth**: Direct Vault token authentication
  - **UserPass (Basic Auth)**: Username/password authentication
  - **LDAP**: Enterprise LDAP integration
  - Persistent authentication (12-hour session)

- **🎯 Background Search Engine**
  - Searches continue in background service worker
  - Results persist when panel is closed/minimized
  - Resume active searches on panel reopen
  - Multiple concurrent search tracking

### 🛡️ Security & Enterprise Features
- **Persistent Auth Storage**: chrome.storage.local with 12-hour expiry
- **Token Refresh**: Automatic token renewal support
- **Session Management**: Activity-based timeout
- **Namespace Support**: Full Vault namespace compatibility
- **CSP Compliant**: Content Security Policy enforced
- **No Password Storage**: Passwords never saved (security best practice)

### 🎨 User Experience
- **Intelligent Search Modes**:
  - Contains (default)
  - Case-sensitive search
  - Directory path search
  - Content value search
- **Real-time Results**: Results stream as they're found
- **Mount Filtering**: Search across all KV mounts
- **Prefix Filtering**: Narrow scope to path prefixes
- **Keyboard Shortcuts**: `Ctrl/Cmd + Shift + K` to open
- **Dark Mode**: Automatic theme detection
- **Responsive Design**: Works on all screen sizes

### ⚙️ Advanced Configuration
- **Adjustable Workers**: 8-64 concurrent workers (default: 48)
- **Configurable Depth**: Control JSON traversal depth
- **Custom Timeouts**: Request timeout configuration
- **Case Sensitivity**: Toggle case-insensitive search
- **KV1/KV2 Auto-Detection**: Seamless version detection

---

## 📦 Installation

### From Chrome Web Store (Recommended)
1. Visit the [Chrome Web Store](https://chrome.google.com/webstore) (link coming soon)
2. Click "Add to Chrome"
3. Click the extension icon to configure

### Manual Installation (Developer Mode)
1. **Clone or Download**:
   ```bash
   git clone https://github.com/sandeshsachdev/vault-search-extension.git
   cd vault-search-extension
   ```

2. **Load in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the extension directory

3. **Pin the Extension**:
   - Click the puzzle piece icon in Chrome toolbar
   - Find "Vault Search Pro"
   - Click the pin icon

---

## 🚀 Quick Start

### Method 1: Configure via Popup (Standalone)

1. **Click the Extension Icon** in your Chrome toolbar

2. **Enter Vault Details**:
   - Vault URL: `https://vault.example.com`
   - Namespace: (optional, e.g., `admin/team`)

3. **Choose Authentication**:
   - **Token Tab**: Paste your Vault token
   - **Basic Auth Tab**: Enter username/password
   - **LDAP Tab**: Enter LDAP credentials

4. **Save & Connect**: Check "Remember me" and click "Save & Connect"

5. **Start Searching**: Visit any Vault UI page or use the floating button

### Method 2: Use with Vault UI (Legacy)

1. **Log into Vault UI** at `https://your-vault.com/ui/`
2. **Click "Search Vault"** button (top-right) or press `Ctrl/Cmd + Shift + K`
3. **Enter search term** and configure options
4. **View Results** as they stream in

---

## 📖 Usage Guide

### Search Interface

```
┌─────────────────────────────────────────────┐
│  Universal Search                    [Close] │
├─────────────────────────────────────────────┤
│  Search term: [password            ]         │
│  Mode: [Contains ▼]  ☑ Case-insensitive    │
├─────────────────────────────────────────────┤
│  Max depth: [10]  Workers: [48]             │
│  Mount filter: [secret/]                    │
│  Prefix filter: [prod/]                     │
├─────────────────────────────────────────────┤
│  [Cancel]  [Search]  Status: Ready          │
├─────────────────────────────────────────────┤
│  📋 Results appear here...                   │
└─────────────────────────────────────────────┘
```

### Search Modes

**Contains** (Default):
```
Search: "pass" → Matches: "password", "bypass", "compass"
```

**Exact**:
```
Search: "password" → Only matches: "password"
```

**Regex**:
```
Search: "pass(word|phrase)" → Matches: "password", "passphrase"
```

**Fuzzy** (Similarity threshold: 0.8):
```
Search: "pasword" → Matches: "password" (typo tolerance)
```

### Filtering

**Mount Filter**: Limit search to specific mount points
```
Mount filter: "secret/" → Only searches secret/ mount
```

**Prefix Filter**: Narrow to specific path prefixes
```
Prefix filter: "prod/" → Only searches paths starting with prod/
```

---

## ⚙️ Configuration

### Settings Storage

The extension uses `chrome.storage.sync` for:
- Vault URL (persisted)
- Namespace (persisted)
- Authentication type (persisted)
- Remember me preference (persisted)
- Username (if Remember Me enabled)
- Mount paths (if Remember Me enabled)

**Security Note**: Passwords and tokens are NEVER persisted when "Remember me" is checked. They are only stored in session memory.

### Advanced Options

**Worker Count** (8-64, default: 48):
- Higher = Faster but more network load
- Lower = Gentler on Vault server
- Recommended: 16-24 for rate-limited environments

**Max Depth** (1-50, default: 10):
- Controls how deep to traverse nested JSON
- Higher values find more but take longer
- Adjust based on your secret structure

---

## 🏗️ Architecture

### Component Overview

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│   popup.html │────▶│  background.js  │◀────│  content.js  │
│   popup.js   │     │ (Service Worker)│     │   (Search)   │
└──────────────┘     └─────────────────┘     └──────────────┘
       │                      │                       │
       │                      │                       │
       ▼                      ▼                       ▼
 [User Config]          [Auth State]           [Vault API]
 [Credentials]          [Token Mgmt]           [Results UI]
```

### Files

- **`manifest.json`**: Extension configuration (MV3)
- **`background.js`**: Service worker for auth and state management
- **`popup.html/js`**: Settings and authentication UI
- **`content.js`**: Main search engine and UI injection
- **`ui.css`**: Styling for search interface
- **`utils.js`**: Utility functions, validators, helpers

---

## 🔒 Security Considerations

### What We Do
✅ Session-only token storage (in-memory)
✅ 12-hour automatic session expiry
✅ CSP (Content Security Policy) enforcement
✅ Input validation and sanitization
✅ HTTPS-only Vault connections (configurable)
✅ No analytics or telemetry

### What We Don't Do
❌ Never store passwords persistently
❌ Never send data to third parties
❌ No external API calls
❌ No tracking or user profiling

### Best Practices
1. **Use token auth when possible** (most secure)
2. **Enable "Remember me" only on trusted devices**
3. **Regularly rotate Vault tokens**
4. **Use namespaces for isolation**
5. **Review Chrome extension permissions**

---

## 🐛 Troubleshooting

### Common Issues

**Issue**: "Not authenticated" error
- **Solution**: Click extension icon and configure connection

**Issue**: "Permission denied" on some paths
- **Solution**: Check your Vault policies and token capabilities

**Issue**: Search is slow
- **Solution**: Reduce worker count or add mount/prefix filters

**Issue**: Token expired
- **Solution**: Re-authenticate via popup

**Issue**: Results not showing
- **Solution**: Check browser console (F12) for errors

### Debug Mode

Enable detailed logging:
1. Open DevTools (F12)
2. Go to Console tab
3. Look for `[Vault UI Search]` messages

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Setup

```bash
# Clone the repo
git clone https://github.com/sandeshsachdev/vault-search-extension.git
cd vault-search-extension

# Load in Chrome (Developer mode)
# 1. Go to chrome://extensions/
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select this directory

# Make changes and reload extension
```

---

## 📝 Changelog

### Version 2.0.0 (2025-11-06)
- ✨ **NEW**: Standalone authentication system with popup UI
- ✨ **NEW**: Multi-auth support (Token, UserPass, LDAP)
- ✨ **NEW**: Remember me functionality
- ✨ **NEW**: Background service worker for state management
- ✨ **NEW**: Token refresh and session management
- ✨ **NEW**: Enhanced UI with animations and dark mode
- ✨ **NEW**: Keyboard shortcuts (Ctrl/Cmd+Shift+K)
- 🔒 **SECURITY**: CSP implementation
- 🔒 **SECURITY**: Input validation and sanitization
- 🎨 **UI**: Complete redesign with modern aesthetics
- 📚 **DOCS**: Comprehensive documentation and README
- 🐛 **FIX**: Various bug fixes and improvements

### Version 1.3.0 (Previous)
- Two-phase search engine
- Path-first scanning
- Higher concurrency (48 workers)
- Mount and prefix filters

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

Copyright (c) 2025 Sandesh Sachdev

---

## 👤 Author

**Sandesh Sachdev**

- GitHub: [@sandeshsachdev](https://github.com/sandeshsachdev)
- Email: [your-email@example.com]

---

## 🙏 Acknowledgments

- HashiCorp for Vault
- Chrome Extension team for excellent documentation
- Open source community for inspiration

---

## 📬 Support

- **Issues**: [GitHub Issues](https://github.com/sandeshsachdev/vault-search-extension/issues)
- **Questions**: [GitHub Discussions](https://github.com/sandeshsachdev/vault-search-extension/discussions)
- **Email**: [your-email@example.com]

---

## ⭐ Star History

If you find this extension useful, please consider giving it a star on GitHub!

---

**Made with ❤️ by Sandesh Sachdev**
