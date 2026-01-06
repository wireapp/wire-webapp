#!/usr/bin/env node

/**
 * Workaround for libsodium-wrappers@0.7.16 package bug.
 *
 * The libsodium-wrappers ESM module incorrectly tries to import './libsodium.mjs'
 * from its own directory, but the file actually exists in the separate 'libsodium'
 * package. This script copies the file to the expected location after installation.
 *
 * See: https://github.com/jedisct1/libsodium.js/issues
 */

const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '../node_modules/libsodium/dist/modules-esm/libsodium.mjs');
const targetDir = path.join(__dirname, '../node_modules/libsodium-wrappers/dist/modules-esm');
const targetFile = path.join(targetDir, 'libsodium.mjs');

try {
  // Check if source file exists
  if (!fs.existsSync(sourceFile)) {
    console.log('libsodium source file not found, skipping copy');
    process.exit(0);
  }

  // Check if target directory exists
  if (!fs.existsSync(targetDir)) {
    console.log('libsodium-wrappers target directory not found, skipping copy');
    process.exit(0);
  }

  // Copy the file
  fs.copyFileSync(sourceFile, targetFile);
  console.log('Successfully copied libsodium.mjs to libsodium-wrappers directory');
} catch (error) {
  console.error('Error copying libsodium.mjs:', error.message);
  // Don't fail the installation if this workaround fails
  process.exit(0);
}
