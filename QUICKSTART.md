# ⚡ Quick Start Guide

Get up and running with Vault Search Pro in 5 minutes!

## 1️⃣ Load Extension

```bash
# Option A: Load existing files
1. Open Chrome → chrome://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select this folder

# Option B: Build first (if you want)
npm install
npm run build
# Then load the 'build' folder instead
```

## 2️⃣ Configure Connection

Click the extension icon (🔐) in Chrome toolbar:

**Enter Vault Details:**
- Vault URL: `https://your-vault.com`
- Namespace: `optional-namespace` (or leave blank)

**Choose Auth Method:**

**Token:**
```
Token: hvs.CAESIJ...
```

**Basic Auth (UserPass):**
```
Username: your-username
Password: your-password
Mount: userpass
```

**LDAP:**
```
Username: your-ldap-username
Password: your-ldap-password
Mount: ldap
```

**Save:**
- ☑ Check "Remember me"
- Click "Save & Connect"

## 3️⃣ Start Searching

**Method 1:** Click "Search Vault" button (top-right of any page)

**Method 2:** Press `Ctrl+Shift+K` (Windows/Linux) or `Cmd+Shift+K` (Mac)

## 4️⃣ Search Examples

**Basic Search:**
```
Search: password
Mode: Contains
```

**Filter by Mount:**
```
Search: api-key
Mount filter: secret/
```

**Filter by Path:**
```
Search: prod
Prefix filter: apps/prod/
```

**Regex Search:**
```
Search: (password|secret|key)
Mode: Regex
```

## 🎯 Tips

- **Fast Results**: Phase A shows paths instantly, Phase B scans values
- **Performance**: Reduce workers (16-24) if Vault is rate-limited
- **Filters**: Use mount/prefix filters to narrow search scope
- **Keyboard**: `Ctrl/Cmd+Shift+K` opens search from anywhere

## 🆘 Troubleshooting

**"Not authenticated"**
→ Click extension icon and configure

**"No results"**
→ Check permissions and filters

**Slow search**
→ Reduce workers or add filters

## 📚 More Info

- Full docs: [README.md](README.md)
- Installation: [INSTALL.md](INSTALL.md)
- Changes: [CHANGELOG.md](CHANGELOG.md)

## ✨ Features You'll Love

- ⚡ Blazing fast two-phase search
- 🔐 Multiple auth methods (Token, UserPass, LDAP)
- 💾 Remember me functionality
- 🎨 Beautiful modern UI with dark mode
- ⌨️ Keyboard shortcuts
- 🔒 Secure session management
- 🌐 Works standalone or with Vault UI

---

**Made with ❤️ by Sandesh Sachdev**
