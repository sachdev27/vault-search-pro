# Changelog

All notable changes to the Vault Search Pro extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2025-11-06

### Added
- **Search from Anywhere**: New dual-tab popup interface with "Search" and "Settings" tabs
- **Universal Search**: Search Vault secrets from any webpage, not just Vault pages
- **Popup Search Interface**: Complete search UI in extension popup with real-time results
- **Loading Spinners**: Visual feedback during search operations with animated spinners
- **Match Type Indicators**: Shows whether results are path matches or content matches
- **Content Preview**: Displays matching key-value pairs in search results
- **Click-to-Open Results**: Results in popup are clickable and open in Vault UI

### Changed
- **Complete Theme Redesign**: Changed from white-on-black to minimal black-on-white theme
- **Removed Dark Mode**: Consistent white background design for better readability
- **Refined UI Elements**: Cleaner borders, subtle shadows, and improved spacing
- **Enhanced Buttons**: Better hover effects and visual feedback
- **Improved Forms**: Refined input styling with focus states
- **Optimized Popup Search**: Limited to 100 paths and depth 3 for performance
- **Status Synchronization**: Connection status shown on both Search and Settings tabs

### Fixed
- Loading indicator visibility during search phases
- Result card hover effects
- Scrollbar styling for better contrast

## [2.0.0] - 2025-11-06

### Added
- **Standalone Authentication System**: Complete popup UI for configuring Vault connection without visiting Vault UI
- **Multi-Auth Support**: Token, UserPass (Basic Auth), and LDAP authentication methods
- **Background Service Worker**: Manages authentication state and token lifecycle
- **Remember Me Functionality**: Optionally saves Vault URL and credentials (passwords never saved)
- **Last URL Memory**: Automatically remembers and populates last used Vault URL
- **Token Refresh**: Automatic token renewal for renewable tokens
- **Session Management**: 12-hour session timeout with inactivity tracking
- **Keyboard Shortcuts**: Ctrl/Cmd + Shift + K to open search modal
- **Enhanced UI**: Modern gradient design with animations and transitions
- **Dark Mode Support**: Automatic theme detection and dark mode styling
- **Loading Indicators**: Spinner animations and status updates
- **Connection Status**: Visual indicator showing Vault connection state
- **Context Menu**: Right-click extension icon for quick actions
- **Notifications**: Chrome notifications for session events
- **Comprehensive Documentation**: Professional README with installation guide, usage instructions, and troubleshooting
- **Utility Library**: Validation, sanitization, error handling, and helper functions
- **Export Functionality**: Utilities for exporting results to CSV/JSON
- **Rate Limiting**: Built-in rate limiter for API requests
- **Retry Logic**: Exponential backoff for failed requests
- **Error Handling**: Custom error classes and comprehensive error messages

### Security
- **Content Security Policy**: Enforced CSP for extension pages
- **Input Validation**: All user inputs validated and sanitized
- **No Password Storage**: Passwords never persisted (security best practice)
- **Session-based Tokens**: Tokens stored only in memory, not persisted
- **HTTPS Enforcement**: Configurable HTTPS-only connections
- **XSS Prevention**: HTML sanitization for user-generated content

### Changed
- **Extension Name**: Changed from "Vault UI Search" to "Vault Search Pro"
- **Version Bump**: Major version to 2.0.0 (breaking changes in manifest)
- **Manifest Version**: Updated to MV3 with new permissions structure
- **Host Permissions**: Expanded to support standalone operation
- **UI Layout**: Completely redesigned with modern aesthetics
- **Button Position**: Enhanced with gradient background and hover effects
- **Modal Animation**: Added fade-in and slide-in animations
- **Result Cards**: Improved styling with hover effects and better spacing
- **Color Scheme**: Updated to purple gradient theme
- **Font System**: Improved typography with system font stack

### Improved
- **Error Messages**: More descriptive and actionable error messages
- **User Feedback**: Better status updates and progress indicators
- **Accessibility**: ARIA labels and keyboard navigation
- **Responsiveness**: Better mobile and small screen support
- **Performance**: Optimized search algorithm and result rendering
- **Code Organization**: Modular structure with separate utility files
- **Documentation**: Comprehensive inline code documentation
- **Logging**: Structured logging with log levels

### Fixed
- **Token Detection**: Improved token auto-detection from Vault UI
- **Namespace Handling**: Better namespace support and fallbacks
- **Mount Detection**: More reliable KV mount discovery
- **Concurrent Requests**: Better handling of parallel API calls
- **Memory Leaks**: Proper cleanup of event listeners and timers
- **Race Conditions**: Fixed potential race conditions in search
- **Error Recovery**: Better error recovery and user guidance

## [1.3.0] - Previous Version

### Added
- Two-phase search engine (path-first, then deep scan)
- Phase A: Ultra-fast path-only scanning
- Phase B: Deep value search on candidates
- Real-time result streaming
- Higher default concurrency (48 workers)
- Mount and prefix filters
- Request timeouts
- KV1/KV2 auto-detection

### Changed
- Floating button moved to top-right
- Increased worker count from 16 to 48
- Improved result rendering

### Features
- Contains, exact, regex, and fuzzy search modes
- Case-insensitive search option
- Configurable max depth for JSON traversal
- Adjustable worker count
- Token capture from Vault UI copy button
- Manual token input fallback

---

## Release Notes

### Version 2.0.0 Highlights

This is a **major release** with significant new features and improvements:

🎉 **Standalone Operation**: No longer need to visit Vault UI first! Configure everything from the extension popup.

🔐 **Multi-Auth**: Support for Token, UserPass, and LDAP authentication methods.

💾 **Remember Me**: Optionally save your Vault URL and credentials (securely).

⚡ **Better UX**: Modern UI with animations, dark mode, and keyboard shortcuts.

🛡️ **Enhanced Security**: CSP, input validation, session management, and more.

📚 **Documentation**: Comprehensive guides and troubleshooting resources.

### Upgrade Notes

If upgrading from 1.x:
- Your existing functionality is preserved
- New features are opt-in (extension works both standalone and with Vault UI)
- No breaking changes to search functionality
- Recommended to configure via popup for best experience

### Known Issues

- None at release time

### Roadmap

Future versions may include:
- Search history and favorite searches
- Export search results (CSV/JSON)
- Custom search templates
- Bulk secret operations
- Advanced filtering options
- Performance analytics
- Team collaboration features

---

**Author**: Sandesh Sachdev
**Repository**: https://github.com/sandeshsachdev/vault-search-extension
**License**: MIT
