#!/usr/bin/env node
/**
 * Validation script for Vault Search Pro
 * Checks for common issues before building
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Vault Search Pro...\n');

let errors = 0;
let warnings = 0;

// Check required files
console.log('📋 Checking required files:');
const requiredFiles = [
  'manifest.json',
  'background.js',
  'content.js',
  'popup.html',
  'popup.js',
  'ui.css',
  'icon32.png',
  'icon64.png',
  'icon128.png'
];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✓ ${file}`);
  } else {
    console.error(`  ✗ ${file} - MISSING`);
    errors++;
  }
});

// Validate manifest
console.log('\n🔍 Validating manifest.json:');
try {
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));

  // Check version
  if (manifest.manifest_version !== 3) {
    console.error('  ✗ manifest_version must be 3');
    errors++;
  } else {
    console.log('  ✓ Manifest version 3');
  }

  // Check required fields
  const requiredFields = ['name', 'version', 'description', 'icons', 'permissions'];
  requiredFields.forEach(field => {
    if (manifest[field]) {
      console.log(`  ✓ ${field}`);
    } else {
      console.error(`  ✗ ${field} - MISSING`);
      errors++;
    }
  });

  // Check version format
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
    console.warn('  ⚠ Version should follow semver (X.Y.Z)');
    warnings++;
  }

  // Check description length
  if (manifest.description.length > 132) {
    console.error('  ✗ Description too long (max 132 characters)');
    errors++;
  } else {
    console.log(`  ✓ Description length (${manifest.description.length}/132)`);
  }

  // Check author
  if (manifest.author) {
    console.log(`  ✓ Author: ${manifest.author}`);
  } else {
    console.warn('  ⚠ No author specified');
    warnings++;
  }

} catch (error) {
  console.error('  ✗ Failed to parse manifest.json:', error.message);
  errors++;
}

// Check JavaScript syntax
console.log('\n📝 Checking JavaScript files:');
const jsFiles = ['background.js', 'content.js', 'popup.js', 'utils.js'];

jsFiles.forEach(file => {
  try {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');

      // Basic syntax checks
      if (content.includes('console.log(')) {
        console.warn(`  ⚠ ${file} contains console.log (should use console.debug)`);
        warnings++;
      }

      // Check for TODO comments
      const todos = content.match(/\/\/ TODO:/gi);
      if (todos) {
        console.warn(`  ⚠ ${file} has ${todos.length} TODO comment(s)`);
        warnings++;
      }

      console.log(`  ✓ ${file}`);
    }
  } catch (error) {
    console.error(`  ✗ ${file}:`, error.message);
    errors++;
  }
});

// Check HTML
console.log('\n📄 Checking HTML files:');
if (fs.existsSync('popup.html')) {
  const html = fs.readFileSync('popup.html', 'utf8');

  // Check for inline scripts
  if (html.includes('<script>') && !html.includes('<script src=')) {
    console.error('  ✗ Inline scripts not allowed (CSP violation)');
    errors++;
  } else {
    console.log('  ✓ No inline scripts');
  }

  // Check for inline styles
  if (html.match(/style="/gi)) {
    console.warn('  ⚠ Inline styles found (prefer external CSS)');
    warnings++;
  }

  console.log('  ✓ popup.html');
}

// Summary
console.log('\n' + '='.repeat(50));
if (errors === 0 && warnings === 0) {
  console.log('✅ All checks passed!');
  console.log('🚀 Ready to build');
} else {
  if (errors > 0) {
    console.error(`❌ ${errors} error(s) found`);
  }
  if (warnings > 0) {
    console.warn(`⚠️  ${warnings} warning(s) found`);
  }

  if (errors > 0) {
    console.log('\n❌ Fix errors before building');
    process.exit(1);
  } else {
    console.log('\n⚠️  Consider fixing warnings');
  }
}

console.log('='.repeat(50) + '\n');
