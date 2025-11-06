#!/usr/bin/env node
/**
 * Build script for Vault Search Pro
 * Creates a production-ready build of the extension
 */

const fs = require('fs');
const path = require('path');

const BUILD_DIR = 'build';
const SOURCE_FILES = [
  'manifest.json',
  'background.js',
  'content.js',
  'popup.html',
  'popup.js',
  'ui.css',
  'utils.js',
  'icon16.png',
  'icon48.png',
  'icon128.png',
  'README.md',
  'LICENSE'
];

console.log('🔨 Building Vault Search Pro...\n');

// Clean build directory
if (fs.existsSync(BUILD_DIR)) {
  console.log('🧹 Cleaning build directory...');
  fs.rmSync(BUILD_DIR, { recursive: true });
}

// Create build directory
fs.mkdirSync(BUILD_DIR, { recursive: true });
console.log('📁 Created build directory\n');

// Copy files
console.log('📋 Copying files:');
SOURCE_FILES.forEach(file => {
  const sourcePath = path.join(__dirname, '..', file);
  const destPath = path.join(__dirname, '..', BUILD_DIR, file);

  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`  ✓ ${file}`);
  } else {
    console.warn(`  ⚠ Warning: ${file} not found`);
  }
});

// Validate manifest
console.log('\n🔍 Validating manifest...');
const manifestPath = path.join(__dirname, '..', BUILD_DIR, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

if (manifest.manifest_version !== 3) {
  console.error('❌ Error: Manifest version must be 3');
  process.exit(1);
}

if (!manifest.name || !manifest.version || !manifest.description) {
  console.error('❌ Error: Manifest missing required fields');
  process.exit(1);
}

console.log(`  ✓ Manifest valid (v${manifest.version})`);

// Calculate build size
let totalSize = 0;
SOURCE_FILES.forEach(file => {
  const filePath = path.join(__dirname, '..', BUILD_DIR, file);
  if (fs.existsSync(filePath)) {
    totalSize += fs.statSync(filePath).size;
  }
});

console.log(`\n✅ Build complete!`);
console.log(`📦 Build size: ${(totalSize / 1024).toFixed(2)} KB`);
console.log(`📍 Output: ${BUILD_DIR}/\n`);
