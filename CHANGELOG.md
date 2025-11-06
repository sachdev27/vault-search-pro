# Changelog

All notable changes to the Vault Search Pro extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.0] - 2025-11-07

### Added
- **GitHub Pages Website**: Professional marketing site at https://sachdev27.github.io/vault-advance-search
- **Interactive Demo**: Live demo page showcasing extension features with simulated search
- **Privacy Policy Page**: Comprehensive privacy policy hosted on GitHub Pages
- **Buy Me a Coffee Link**: Support link added to popup and website
- **Chrome Web Store Documentation**: Complete submission guides and justifications
- **Optional Host Permissions**: Runtime permission requests for enhanced security

### Changed
- **Permission Model**: Changed from required `host_permissions` to `optional_host_permissions`
- **Runtime Permission Requests**: Permissions now requested when user configures Vault URL
- **User Consent Flow**: Chrome permission dialog shown to user before accessing Vault server
- **Enhanced Security**: Extension installs with zero host access by default
- **Repository Name**: Updated references from vault-search-pro to vault-advance-search

### Security
- **Improved Permission Model**: Optional permissions provide better security and transparency
- **User Control**: Users can grant/revoke permissions at any time
- **Runtime Requests**: Permissions requested only when needed, not at install
- **Chrome Permission Dialog**: Native browser permission prompts for user consent
- **Minimal Install Footprint**: No host access until user explicitly configures extension

### Documentation
- **CHROME_WEBSTORE_RESOLUTION.md**: Complete guide for Chrome Web Store submission
- **HOST_PERMISSIONS_JUSTIFICATION.md**: Detailed explanation of permission requirements
- **SCRIPTING_PERMISSION_RESOLVED.md**: Documentation for removed unnecessary permission
- **FINAL_SUBMISSION_CHECKLIST.md**: Pre-submission verification checklist
- **Privacy Policy**: Professional privacy policy page with comprehensive disclosures
- **Updated README**: Cleaned up to reflect only actual extension features

### Fixed
- Removed unnecessary `scripting` permission from manifest
- Corrected GitHub repository URLs throughout documentation
- Updated demo and website footer links to include privacy policy
- Cleaned up README to remove non-existent features (side panel, advanced search modes)

### Website & Demo
- **Marketing Site**: Feature showcase, installation guide, and documentation
- **Demo Page**: Interactive replica of extension popup with simulated Vault data
- **Responsive Design**: Mobile-friendly layout with modern aesthetics
- **Navigation**: Seamless links between home, demo, and privacy policy pages
- **Professional Branding**: Consistent purple gradient theme across all pages

### Chrome Web Store Preparation
- **Permission Justifications**: Ready-to-use explanations for all 6 permissions
- **Privacy Practices**: Complete data usage disclosures and certifications
- **Store Listing**: Optimized description, screenshots guidance, and category selection
- **Review Response Templates**: Prepared responses for common reviewer questions
- **Compliance**: Full adherence to Chrome Web Store policies and best practices

### Developer Experience
- **Comprehensive Guides**: Step-by-step submission process documentation
- **Testing Instructions**: Verification procedures for permission flow
- **Response Templates**: Pre-written responses for Chrome Web Store review
- **Troubleshooting**: Common issues and solutions documented

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

### Version 2.3.0 Highlights

This release focuses on **Chrome Web Store preparation** and **enhanced security**:

🔒 **Optional Permissions**: Changed to runtime permission model - extension installs with zero host access by default. Users explicitly grant permissions when configuring their Vault URL.

🌐 **GitHub Pages**: Professional website with interactive demo at https://sachdev27.github.io/vault-advance-search

📄 **Privacy Policy**: Comprehensive privacy policy page for Chrome Web Store compliance

📋 **Chrome Web Store Ready**: Complete documentation, justifications, and guides for Chrome Web Store submission

🛡️ **Enhanced Security**: User controls all permissions through Chrome's native permission dialogs

✨ **Interactive Demo**: Live demo showing all features with simulated Vault data

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
**Repository**: https://github.com/sachdev27/vault-advance-search
**Website**: https://sachdev27.github.io/vault-advance-search
**License**: MIT
