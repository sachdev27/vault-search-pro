#!/usr/bin/env node
/**
 * Package script for Vault Search Pro
 * Creates a ZIP file ready for Chrome Web Store upload
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const BUILD_DIR = 'build';
const DIST_DIR = 'dist';
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const ZIP_NAME = `vault-search-pro-v${manifest.version}.zip`;

console.log('📦 Packaging Vault Search Pro...\n');

// Ensure build exists
if (!fs.existsSync(BUILD_DIR)) {
  console.error('❌ Error: Build directory not found. Run "npm run build" first.');
  process.exit(1);
}

// Create dist directory
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

// Create ZIP
const output = fs.createWriteStream(path.join(DIST_DIR, ZIP_NAME));
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  const sizeKB = (archive.pointer() / 1024).toFixed(2);
  console.log(`\n✅ Package created!`);
  console.log(`📦 File: ${DIST_DIR}/${ZIP_NAME}`);
  console.log(`📊 Size: ${sizeKB} KB`);
  console.log(`\n🚀 Ready for Chrome Web Store upload!\n`);
});

archive.on('error', (err) => {
  console.error('❌ Error creating package:', err);
  process.exit(1);
});

archive.pipe(output);
archive.directory(BUILD_DIR, false);
archive.finalize();

console.log(`📁 Archiving ${BUILD_DIR}/ → ${DIST_DIR}/${ZIP_NAME}...`);
