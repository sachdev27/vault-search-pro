# Vault Search Pro - Marketing Website & Interactive Demo

This folder contains the GitHub Pages marketing site and interactive demo for the Vault Search Pro Chrome extension.

## 🌐 Live Site

**Main Site**: https://sachdev27.github.io/vault-advance-search/
**Interactive Demo**: https://sachdev27.github.io/vault-advance-search/demo.html

## 📁 Files

### Marketing Site
- `index.html` - Main landing page with hero, features, and install guide
- `styles.css` - Marketing site styling and animations (825 lines)
- `script.js` - Tab switching and interactive elements

### Interactive Demo
- `demo.html` - **Fully functional replica of the extension popup**
- `demo.css` - Demo page styling including popup replica (650+ lines)
- `demo.js` - Complete demo functionality with simulated search (300+ lines)

### Documentation
- `deploy.sh` - Deployment helper script
- `DEPLOYMENT.md` - Complete deployment guide
- `README.md` - This file

## 🎮 Interactive Demo Features

The demo page (`demo.html`) provides a **pixel-perfect, fully interactive** replica of the extension:

### What Works
- ✅ **Tab Switching** - Toggle between Search and Settings tabs
- ✅ **Live Search** - Enter terms and watch results stream in real-time
- ✅ **Search Options** - Case sensitive and exact match toggles
- ✅ **Cancel Functionality** - Stop searches mid-flight
- ✅ **Result Display** - 20+ sample Vault paths with metadata
- ✅ **Settings Panel** - Configure Vault URL, namespace, token
- ✅ **Connection Testing** - Simulated connection verification
- ✅ **Status Messages** - Real-time feedback for all actions
- ✅ **Realistic Timing** - Results appear every 400-1000ms

### Try These Searches
- `database` - Find database credentials
- `api-key` - Locate API keys
- `password` - Search for passwords
- `secret` - Find secret paths

## 🚀 Quick Deploy

```bash
./deploy.sh
```

This script will:
1. Check for uncommitted changes
2. Commit and push to GitHub
3. Show you the GitHub Pages setup instructions

## 🎨 Features

- ✨ Animated hero with floating cards
- 🎯 Interactive popup preview
- 📊 Feature showcase grid
- 💬 Testimonial cards
- 📱 Fully responsive design
- 🌙 Dark theme with gradients
- ⚡ Smooth animations

## 🔧 Local Testing

```bash
# Python
python3 -m http.server 8000

# Node.js
npx http-server -p 8000
```

Then visit http://localhost:8000

## 📝 Customization

See `DEPLOYMENT.md` for complete customization guide including:
- Updating content
- Changing colors/themes
- Modifying animations
- Adding analytics
- SEO optimization

## 📦 Tech Stack

- Pure HTML5/CSS3/JavaScript (no frameworks)
- Google Fonts (Inter, Fira Code)
- CSS Grid & Flexbox for layout
- CSS animations for effects
- ~30KB total page size

## 🎯 Purpose

This marketing site serves to:
- Showcase extension features with visual demos
- Provide an interactive preview before installation
- Explain use cases and benefits
- Drive installations from the Chrome Web Store
- Improve SEO and discoverability

---

Built with ❤️ by Sandesh Sachdev
