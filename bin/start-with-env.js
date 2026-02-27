#!/usr/bin/env node

/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

const fs = require('fs');
const path = require('path');
const {spawn} = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
const environment = args[0] || 'dev';

// Available environments
const availableEnvs = ['dev', 'anta', 'bella', 'chala', 'fulu', 'imai', 'foma'];

// Root directory
const rootDir = path.resolve(__dirname, '..');
const envFile = path.join(rootDir, '.env');

/**
 * Display usage information
 */
/**
 * Display usage information
 */
function showUsage() {
  console.log('\n📋 Usage: yarn start [<environment>]');
  console.log('\n🌍 Available environments:');
  availableEnvs.forEach(env => {
    console.log(`   - ${env}${env === 'dev' ? ' (default)' : ''}`);
  });
  console.log('\n📝 Examples:');
  console.log('   yarn start           # Uses dev environment (default)');
  console.log('   yarn start anta      # Uses anta environment\n');
}

/**
 * Parse .env file content into key-value pairs
 * @param {string} content - .env file content
 * @returns {Map<string, string>} Map of environment variables
 */
function parseEnvFile(content) {
  const envMap = new Map();
  const lines = content.split('\n');

  for (const line of lines) {
    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith('#')) {
      continue;
    }

    // Parse KEY=VALUE format
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      envMap.set(key, value);
    }
  }

  return envMap;
}

/**
 * Serialize environment map back to .env format
 * @param {Map<string, string>} envMap - Environment variables map
 * @param {string} comment - Comment to add at the top
 * @returns {string} .env file content
 */
function serializeEnvFile(envMap, comment = '') {
  let content = comment ? `# ${comment}\n\n` : '';
  
  for (const [key, value] of envMap) {
    content += `${key}=${value}\n`;
  }

  return content;
}

/**
 * Load environment configuration by merging base with environment-specific overrides
 * @param {string} env - Environment name
 * @returns {boolean} Success status
 */
function loadEnvironment(env) {
  const envSourceFile = path.join(rootDir, 'env', `.env.${env}`);
  const baseEnvFile = path.join(rootDir, '.env');
  const backupFile = path.join(rootDir, 'env', '.env.backup');

  // Check if environment file exists
  if (!fs.existsSync(envSourceFile)) {
    console.error(`\n❌ Error: Environment file 'env/.env.${env}' not found!`);
    console.log(`\n💡 Available environments: ${availableEnvs.join(', ')}\n`);
    return false;
  }

  try {
    // Read base .env file
    let baseEnvMap = new Map();
    if (fs.existsSync(baseEnvFile)) {
      const baseContent = fs.readFileSync(baseEnvFile, 'utf8');
      baseEnvMap = parseEnvFile(baseContent);
      
      // Create backup
      fs.writeFileSync(backupFile, baseContent, 'utf8');
    }

    // Read environment-specific overrides
    const envContent = fs.readFileSync(envSourceFile, 'utf8');
    const envOverrides = parseEnvFile(envContent);

    // Merge: base + overrides
    const mergedEnv = new Map([...baseEnvMap, ...envOverrides]);

    // Write merged configuration to .env
    const mergedContent = serializeEnvFile(
      mergedEnv,
      `Active environment: ${env} (merged with base .env)`
    );
    fs.writeFileSync(envFile, mergedContent, 'utf8');

    console.log(`\n✅ Loaded environment: ${env}`);
    console.log(`📁 Merged base .env with overrides from env/.env.${env}`);
    console.log(`💾 Backup saved to env/.env.backup\n`);
    
    return true;
  } catch (error) {
    console.error(`\n❌ Error loading environment: ${error.message}\n`);
    return false;
  }
}

/**
 * Start the server
 */
function startServer() {
  console.log('🚀 Starting server...\n');

  // Run nx serve server using the local nx binary
  const nxPath = path.join(rootDir, 'node_modules', '.bin', 'nx');
  const child = spawn(nxPath, ['serve', 'server'], {
    stdio: 'inherit',
    cwd: rootDir,
    env: {...process.env},
  });

  child.on('error', error => {
    console.error(`\n❌ Failed to start server: ${error.message}\n`);
    process.exit(1);
  });

  child.on('exit', code => {
    if (code !== 0) {
      console.error(`\n❌ Server exited with code ${code}\n`);
      process.exit(code || 1);
    }
  });

  // Handle termination signals
  process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down...\n');
    child.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    child.kill('SIGTERM');
  });
}

/**
 * Main execution
 */
function main() {
  // Validate environment
  if (!availableEnvs.includes(environment)) {
    console.error(`\n❌ Invalid environment: ${environment}`);
    showUsage();
    process.exit(1);
  }

  // Load environment and start server
  if (loadEnvironment(environment)) {
    startServer();
  } else {
    process.exit(1);
  }
}

// Run the script
main();
