# Update Notes - Minimal Black on White Theme & Enhanced Functionality

## Version 2.1.0 - November 6, 2025

### 🎨 Design Overhaul
**Minimal Black on White Theme**
- Changed from white-on-black to clean black-on-white design
- Removed all dark mode styling for consistency
- Minimalistic approach with subtle borders and shadows
- Black accents (#000000) on white (#ffffff) background
- Lighter grey tones (#f5f5f5, #e0e0e0) for subtle UI elements
- Enhanced readability and professional appearance

### ✨ New Features

#### 1. **Search from Anywhere**
- **NEW**: Popup now has two tabs: "Search" and "Settings"
- Search Vault secrets from **any webpage** - not just Vault pages
- Real-time search with fuzzy, exact, and substring matching
- Results display directly in popup with click-to-open functionality
- Performance optimized (limited to 100 paths, depth 3) for popup context

#### 2. **Loading Indicators**
- Added spinning loader during search operations
- Status updates show progress: "Phase A: scanning paths" → "Phase B: deep matches"
- Visual feedback improves user experience

#### 3. **Enhanced UX**
- Connection status shown on both Search and Settings tabs
- Search button disabled when not connected
- Results are clickable and open in new tabs
- Match type indicators (Path match vs Content match)
- Preview of matched content in results

### 🔧 Technical Improvements

**UI/UX Updates:**
- Cleaner button styles with hover effects
- Refined form inputs with better borders
- Improved scrollbar styling
- Result cards with subtle shadows on hover
- Better spacing and typography

**Functionality:**
- Integrated search logic in popup.js
- Async search with proper error handling
- Connection status synchronization
- Tab switching between Search and Settings
- Keyboard shortcuts (Enter to search/save)

### 📝 Component Changes

#### Modified Files:
1. **ui.css** - Complete theme overhaul to black-on-white
2. **popup.html** - Added Search tab with search interface
3. **popup.js** - Added search functionality and tab management
4. **content.js** - Added loading spinners to search status

### 🚨 Known Limitations

**Popup Closing Behavior:**
Chrome browser popups automatically close when clicking outside the popup window. This is **standard browser behavior enforced for security reasons** and cannot be overridden by extensions. 

**Workaround:** Use the Search Vault button on actual Vault pages for a modal experience that stays open.

### 🎯 Usage

**To Use Search from Anywhere:**
1. Click the extension icon in your browser
2. Go to "Settings" tab and configure your Vault connection
3. Click "Save & Connect"
4. Switch to "Search" tab
5. Enter search term and click "🔍 Search Vault"
6. Click on any result to open in Vault UI

**To Use on Vault Pages:**
- The floating "Search Vault" button appears on Vault pages
- This provides a full-screen modal experience
- Supports advanced features like mount filtering and custom depth

### 📊 Search Performance

**Popup Search (Optimized):**
- Max 100 paths checked
- Depth limited to 3 levels
- First 20 secrets read for content matching
- Suitable for quick searches

**On-Page Search (Full Power):**
- Unlimited paths
- Configurable depth
- Full parallel processing
- Best for comprehensive searches

### 🙏 Credits
Designed and developed by **Sandesh Sachdev**

---

**Happy Searching! 🔐**
