# 🔐 Vault Search Pro

[![Version](https://img.shields.io/badge/version-2.3.0-blue.svg)](https://github.com/sachdev27/vault-search-pro)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Chrome](https://img.shields.io/badge/chrome-extension-orange.svg)](https://chrome.google.com/webstore)
[![Live Demo](https://img.shields.io/badge/demo-live-success.svg)](https://sachdev27.github.io/vault-search-pro/)

> **Lightning-fast Chrome extension for HashiCorp Vault secret search**

A powerful Chrome extension that provides instant search capabilities across HashiCorp Vault with **persistent search state**, multi-auth support, and real-time results streaming.

<img width="1792" height="758" alt="SCR-20251106-slua" src="https://github.com/user-attachments/assets/8575fd89-a686-4e9e-9727-848a0e8c1b0c" />

🌐 **[Try the Interactive Demo](https://sachdev27.github.io/vault-search-pro/demo.html)** //
**[Website](https://sachdev27.github.io/vault-search-pro)**

---

## ✨ Features

### 🔍 Smart Search
- **Popup Interface**: Quick access via browser toolbar
- **Persistent Search State**: Resume searches when reopening popup
- **Real-time Results**: Results stream as they're found
- **Search Options**:
  - Exact match filtering
  - Case-insensitive search (default)
- **Content Script Integration**: Search overlay on Vault UI pages
- **Keyboard Shortcut**: `Ctrl/Cmd + Shift + K` to open overlay

### 🔑 Multiple Authentication Methods
- **Token Auth**: Direct Vault token authentication
- **UserPass (Basic Auth)**: Username/password authentication
- **LDAP**: Enterprise LDAP integration
- **Persistent Sessions**: Stay logged in across browser restarts
- **Secure Storage**: Credentials stored locally in browser

### 🎯 Background Search Engine
- **Service Worker**: Searches run in background
- **Result Caching**: Results persist when popup closes
- **Resume Capability**: Continue searches after reopening
- **Cancel Anytime**: Stop searches mid-flight

### 🛡️ Security Features
- **Local Storage**: All credentials stay in your browser
- **No External Transmission**: Direct Vault API communication only
- **Session Timeouts**: Auto-logout for security
- **CSP Compliant**: Content Security Policy enforced
- **No Password Storage**: Passwords never saved (token-based only)

---

## 📦 Installation

### Manual Installation (Developer Mode)

1. **Clone or Download**:
   ```bash
   git clone https://github.com/sachdev27/vault-search-pro.git
   cd vault-search-pro
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

### Method 1: Popup Search

1. **Click the Extension Icon** in your Chrome toolbar

2. **Configure Settings Tab**:
   - Vault URL: `https://vault.example.com`
   - Namespace: (optional, e.g., `admin/`)
   - Choose auth method (Token/Basic Auth/LDAP)
   - Enter credentials
   - Click "Save Settings"

3. **Search Tab**:
   - Enter your search term
   - Toggle "Exact match" if needed (case-insensitive by default)
   - Click "Start Search"
   - Results appear in real-time
   - Click "Cancel" to stop anytime

4. **Persistent State**:
   - Close popup during search → search continues
   - Reopen popup → see accumulated results
   - Cancel button remains functional

### Method 2: Vault UI Overlay

1. **Log into Vault UI** at `https://your-vault.com/ui/`
2. **Press `Ctrl/Cmd + Shift + K`** or click floating button (top-right)
3. **Search overlay appears** over Vault UI
4. **Enter search term** and view results

---

## ⚙️ Configuration

### Settings Storage

The extension uses `chrome.storage.sync` for:

- Vault URL (persisted)
- Namespace (persisted)
- Authentication type (persisted)
- Remember me preference (persisted)
- Username (if Remember Me enabled)

**Security Note**: Passwords and tokens are NEVER persisted when "Remember me" is checked. They are only stored in session memory.

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

- **`manifest.json`**: Extension configuration (Manifest V3)
- **`background.js`**: Service worker for search operations and auth management
- **`popup.html/popup.js`**: Extension popup UI with Settings and Search tabs
- **`content.js`**: Search overlay injection into Vault UI pages
- **`ui.css`**: Styling for content script search interface

---

## 🔒 Security Considerations

### What We Do

✅ Session-only token storage (in-memory)
✅ CSP (Content Security Policy) enforcement
✅ Input validation and sanitization
✅ HTTPS-only Vault connections (recommended)
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

- **Solution**: Reduce concurrent requests or check Vault server performance

**Issue**: Token expired

- **Solution**: Re-authenticate via popup

**Issue**: Results not showing

- **Solution**: Check browser console (F12) for errors

### Debug Mode

Enable detailed logging:

1. Open DevTools (F12)
2. Go to Console tab
3. Look for `[Vault Search]` messages

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
git clone https://github.com/sachdev27/vault-search-pro.git
cd vault-search-pro

# Load in Chrome (Developer mode)
# 1. Go to chrome://extensions/
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select this directory

# Make changes and reload extension
```

---

## 📝 Changelog

### Version 2.3.0 (Latest)

- ✨ **NEW**: Enhanced search result streaming
- ✨ **NEW**: Improved popup UI persistence
- ✨ **NEW**: Better session state management
- 🎨 **UI**: Refined popup interface
- 🐛 **FIX**: Various bug fixes and performance improvements

### Version 2.0.0

- ✨ **NEW**: Standalone authentication system with popup UI
- ✨ **NEW**: Multi-auth support (Token, UserPass, LDAP)
- ✨ **NEW**: Remember me functionality
- ✨ **NEW**: Background service worker for state management
- ✨ **NEW**: Enhanced UI with animations
- ✨ **NEW**: Keyboard shortcuts (Ctrl/Cmd+Shift+K)
- 🔒 **SECURITY**: CSP implementation
- 🔒 **SECURITY**: Input validation and sanitization

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

Copyright (c) 2025 Sandesh Sachdev

---

## 👤 Author

**Sandesh Sachdev**

- GitHub: [@sachdev27](https://github.com/sachdev27)

☕ **Support this project**: [Buy me a coffee](https://buymeacoffee.com/sachdevst)

---

## 🙏 Acknowledgments

- HashiCorp for Vault
- Chrome Extension team for excellent documentation
- Open source community for inspiration

---

## 🌐 Live Demo

Check out the interactive demo and marketing page at:

**[https://sachdev27.github.io/vault-search-pro](https://sachdev27.github.io/vault-search-pro)**

The demo page features:

- Interactive popup preview with tab switching
- Live result streaming animation
- Complete feature showcase
- Installation walkthrough

### Deploying GitHub Pages

The website is hosted from the `docs/` folder. To update:

1. Make changes to files in `docs/` (index.html, demo.html, styles.css, etc.)
2. Commit and push to GitHub
3. Enable GitHub Pages in repository settings:
   - Go to **Settings** → **Pages**
   - Set source to **Deploy from a branch**
   - Select branch: **main** and folder: **/docs**
   - Click **Save**

GitHub Pages will automatically deploy within 1-2 minutes.

---

## 📬 Support

- **Issues**: [GitHub Issues](https://github.com/sachdev27/vault-search-pro/issues)
- **Questions**: [GitHub Discussions](https://github.com/sachdev27/vault-search-pro/discussions)

---

## ⭐ Star History

If you find this extension useful, please consider giving it a star on GitHub!

---

**Made with ❤️ by Sandesh Sachdev**
