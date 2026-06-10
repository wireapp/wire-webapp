#!/usr/bin/env node
import {readFileSync, writeFileSync, readdirSync, statSync} from 'fs';
import {join} from 'path';

const ROOT = '/Users/bardia.rastin/Documents/wire/wire-webapp';

const WORKSPACE_PACKAGES = new Set([
  '@wireapp/commons',
  '@wireapp/copy-config',
  '@wireapp/eslint-config',
  '@wireapp/prettier-config',
  '@wireapp/priority-queue',
  '@wireapp/promise-queue',
  '@wireapp/store-engine',
  '@wireapp/store-engine-dexie',
  '@wireapp/store-engine-fs',
  '@wireapp/telemetry',
  '@wireapp/webapp-events',
  '@wireapp/certificate-check',
  '@wireapp/license-collector',
  'bazinga64',
  '@wireapp/api-client',
  '@wireapp/core',
  '@wireapp/config',
  '@wireapp/react-ui-kit',
]);

const FILES = [
  'package.json',
  'apps/webapp/package.json',
  'apps/server/package.json',
  'libraries/core/package.json',
  'libraries/api-client/package.json',
  ...readdirSync(join(ROOT, 'libraries'))
    .filter(d => statSync(join(ROOT, 'libraries', d)).isDirectory())
    .map(d => `libraries/${d}/package.json`),
];

function rewireDeps(obj) {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  let changed = false;
  for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    if (!obj[section]) {
      continue;
    }
    for (const [name, version] of Object.entries(obj[section])) {
      if (WORKSPACE_PACKAGES.has(name) && version !== 'workspace:^') {
        obj[section][name] = 'workspace:^';
        changed = true;
      }
    }
  }
  return changed;
}

for (const rel of FILES) {
  const path = join(ROOT, rel);
  try {
    const pkg = JSON.parse(readFileSync(path, 'utf8'));
    if (rewireDeps(pkg)) {
      writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
      console.log(`Rewired ${rel}`);
    }
  } catch {
    // skip missing
  }
}
