#!/usr/bin/env node

/**
 * Update Presidio Recognizers Script
 * Fetches the latest recognizers from Microsoft Presidio GitHub repository
 * and updates the local presidio-recognizers.json file
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Presidio GitHub raw file URL
const PRESIDIO_URL =
  'https://raw.githubusercontent.com/microsoft/presidio/main/presidio-analyzer/presidio_analyzer/predefined_recognizers/recognizers.json';

// Target file path
const TARGET_FILE = path.join(__dirname, '../src/presidio/presidio-recognizers.json');

console.log('🔄 Fetching latest Presidio recognizers from GitHub...\n');
console.log(`   Source: ${PRESIDIO_URL}`);
console.log(`   Target: ${TARGET_FILE}\n`);

function fetchPresidioRecognizers() {
  return new Promise((resolve, reject) => {
    https
      .get(PRESIDIO_URL, res => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            // Parse to validate JSON
            const json = JSON.parse(data);
            resolve(json);
          } catch (error) {
            reject(new Error(`Failed to parse JSON: ${error.message}`));
          }
        });
      })
      .on('error', error => {
        reject(new Error(`HTTP request failed: ${error.message}`));
      });
  });
}

function addMetadata(recognizers) {
  return {
    version: '1.0.0',
    updated: new Date().toISOString(),
    source: 'https://github.com/microsoft/presidio',
    description: 'Microsoft Presidio PII recognizers - automatically generated',
    recognizers: recognizers,
  };
}

async function main() {
  try {
    // Fetch recognizers
    const recognizers = await fetchPresidioRecognizers();

    if (!Array.isArray(recognizers)) {
      throw new Error('Invalid format: Expected an array of recognizers');
    }

    console.log(`✅ Successfully fetched ${recognizers.length} recognizers\n`);

    // Add metadata
    const fullData = addMetadata(recognizers);

    // Write to file with pretty formatting
    const jsonString = JSON.stringify(fullData, null, 2);
    fs.writeFileSync(TARGET_FILE, jsonString, 'utf8');

    console.log(`✅ Successfully updated ${TARGET_FILE}\n`);

    // Print summary
    const entityTypes = new Set(recognizers.map(r => r.supported_entity));
    const languages = new Set(recognizers.map(r => r.supported_language));

    console.log('📊 Summary:');
    console.log(`   Total recognizers: ${recognizers.length}`);
    console.log(`   Entity types: ${entityTypes.size}`);
    console.log(`   Languages: ${Array.from(languages).join(', ')}`);
    console.log(`   Updated: ${fullData.updated}`);
    console.log('\n✨ Update complete!\n');
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

main();
