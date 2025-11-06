# GitHub Pages Deployment Guide

## 📄 Overview

The `docs/` folder contains a fully-featured marketing website for the Vault Search Pro Chrome extension. This site is designed to be hosted on GitHub Pages and showcases the extension's features with an interactive demo.

## 🎨 What's Included

### Files
- **`index.html`** - Main landing page with hero, features, interactive preview, workflow, testimonials, and install sections
- **`styles.css`** - Complete styling with dark theme, animations, and responsive design
- **`script.js`** - Interactive tab switching and animated result counter

### Features
- ✨ Animated hero section with floating cards
- 🎯 Interactive popup preview with tab switching
- 📊 Feature grid with hover effects
- 💬 Testimonial cards
- 📦 Installation instructions
- 🎨 Responsive design (mobile-friendly)
- 🌙 Dark theme with gradient accents
- ⚡ Smooth animations and transitions

## 🚀 Deployment Steps

### One-Time Setup

1. **Push your code to GitHub**
   ```bash
   git add docs/
   git commit -m "Add GitHub Pages marketing site"
   git push origin main
   ```

2. **Enable GitHub Pages**
   - Go to your repository on GitHub
   - Click **Settings** → **Pages** (in the left sidebar)
   - Under "Build and deployment":
     - Source: **Deploy from a branch**
     - Branch: **main**
     - Folder: **/docs**
   - Click **Save**

3. **Wait for deployment** (1-2 minutes)
   - GitHub will automatically build and deploy your site
   - You'll see a green checkmark when ready
   - Your site will be live at: `https://sachdev27.github.io/vault-search-pro/`

### Updating the Site

Whenever you make changes to files in `docs/`:

```bash
# Edit your files
vim docs/index.html  # or styles.css, script.js

# Commit and push
git add docs/
git commit -m "Update marketing site"
git push origin main
```

GitHub Pages will automatically redeploy within 1-2 minutes.

## 🎯 Customization Guide

### Update Content

**Hero Section** (`index.html` lines 24-65)
- Change the tagline, description, or CTA buttons
- Update stats (10x faster, version number, etc.)

**Features** (`index.html` lines 80-103)
- Add/remove feature cards
- Modify feature descriptions

**Testimonials** (`index.html` lines 165-179)
- Replace with real user quotes
- Update names and titles

**Installation Links** (`index.html` lines 185-195)
- Update Chrome Web Store link when published
- Update GitHub release links

### Customize Styling

**Colors** (`styles.css` lines 1-18 `:root` variables)
```css
--accent: #5d5dff;        /* Primary brand color */
--accent-strong: #7c5dfa;  /* Hover states */
--bg: #050918;             /* Background */
```

**Typography** (`styles.css` line 8)
```css
font-family: "Inter", system-ui, ...
```

**Animations** (`styles.css` lines 258-272)
- Modify `@keyframes float` for card animation
- Adjust `@keyframes pulse` for glow effect

### Interactive Demo

**Tab Content** (`index.html` lines 129-163)
- Modify the search results shown
- Update settings values
- Change the simulated search state

**Animation Timing** (`script.js` line 42)
```javascript
setInterval(tick, 2400);  // Change speed (milliseconds)
```

**Result Counts** (`script.js` line 26)
```javascript
const counts = [12, 17, 23, 31, 36, 42];  // Customize sequence
```

## 📱 Testing Locally

Before pushing to GitHub, test the site locally:

### Option 1: Python SimpleHTTPServer
```bash
cd docs/
python3 -m http.server 8000
# Visit http://localhost:8000
```

### Option 2: Node.js http-server
```bash
npm install -g http-server
cd docs/
http-server -p 8000
# Visit http://localhost:8000
```

### Option 3: VS Code Live Server
1. Install "Live Server" extension
2. Right-click `docs/index.html`
3. Select "Open with Live Server"

## 🔍 Verification Checklist

Before deploying, verify:

- [ ] All links work (GitHub repo, Chrome Web Store, Buy Me a Coffee)
- [ ] Interactive tab switching functions correctly
- [ ] Animations are smooth (no janky transitions)
- [ ] Mobile responsive (test at 375px, 768px, 1440px widths)
- [ ] All images/icons load (check browser console)
- [ ] Version number matches `manifest.json`
- [ ] Repository URLs match your actual GitHub username/repo

## 🐛 Troubleshooting

### Site not loading after deployment
- Wait 2-3 minutes for initial deployment
- Check repository Settings → Pages for deployment status
- Verify branch is `main` and folder is `/docs`
- Check for any build errors in the Actions tab

### CSS/JS not applying
- Hard refresh your browser: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Check browser console for 404 errors
- Verify file paths are relative (no leading `/`)

### Links broken
- Ensure all internal links use relative paths
- External links should have full URLs with `https://`
- GitHub Pages URLs are case-sensitive

### Animations not working
- Check browser console for JavaScript errors
- Verify `script.js` is loaded (check Network tab)
- Test in different browsers (Chrome, Firefox, Safari)

## 📊 Analytics (Optional)

To track visitors, add Google Analytics or Plausible:

**Google Analytics** (in `<head>` of `index.html`)
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

**Plausible** (privacy-friendly alternative)
```html
<script defer data-domain="yourdomain.com" src="https://plausible.io/js/script.js"></script>
```

## 🎨 Design Assets

If you need to create new graphics:

- **Figma**: Design mockups and export as SVG
- **Canva**: Quick social media graphics
- **Unsplash/Pexels**: Free stock photos (if needed)
- **Hero Patterns**: SVG background patterns

## 📝 SEO Optimization

Improve search engine visibility:

1. **Add meta tags** (in `<head>`)
   ```html
   <meta name="description" content="Lightning-fast HashiCorp Vault secret search. Chrome extension for platform teams and SREs.">
   <meta name="keywords" content="HashiCorp Vault, Chrome Extension, Secret Management, DevOps">
   <meta property="og:title" content="Vault Search Pro - Chrome Extension">
   <meta property="og:description" content="Lightning-fast search across every Vault namespace">
   <meta property="og:image" content="https://yourdomain.com/preview.png">
   ```

2. **Add structured data**
   ```html
   <script type="application/ld+json">
   {
     "@context": "https://schema.org",
     "@type": "SoftwareApplication",
     "name": "Vault Search Pro",
     "applicationCategory": "BrowserExtension",
     "operatingSystem": "Chrome"
   }
   </script>
   ```

3. **Create `robots.txt`** (in `docs/` folder)
   ```
   User-agent: *
   Allow: /
   Sitemap: https://sachdev27.github.io/vault-search-pro/sitemap.xml
   ```

## 🚀 Performance Tips

- All CSS/JS is inline or in single files (fast loading)
- Uses system fonts with Google Fonts fallback
- Animations use GPU-accelerated properties (`transform`, `opacity`)
- No external dependencies or heavy frameworks
- Total page size: ~30KB (excellent!)

## 📧 Support

For issues with the GitHub Pages site:
- Check [GitHub Pages documentation](https://docs.github.com/en/pages)
- Review the [troubleshooting guide](https://docs.github.com/en/pages/getting-started-with-github-pages/troubleshooting-jekyll-build-errors-for-github-pages-sites)

---

**Last Updated**: November 6, 2025
**Maintained by**: Sandesh Sachdev
