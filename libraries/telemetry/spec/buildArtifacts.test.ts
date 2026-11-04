/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {execFileSync} from 'node:child_process';
import {readFileSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

const libraryDirectory = path.resolve(__dirname, '..');
const workspaceDirectory = path.resolve(libraryDirectory, '../..');

function runNode(script: string): string {
  return execFileSync(process.execPath, ['--input-type=module', '--eval', script], {
    cwd: libraryDirectory,
    encoding: 'utf8',
    timeout: 30_000,
  });
}

describe('telemetry build artifacts', () => {
  it.each(['import', 'require'])('loads all public exports through the %s package entry point', moduleFormat => {
    const actualExports: unknown = JSON.parse(
      runNode(`
        import {createRequire} from 'node:module';
        import assert from 'node:assert/strict';
        const require = createRequire(import.meta.url);
        const telemetry = ${moduleFormat === 'import' ? "await import('@wireapp/telemetry')" : "require('@wireapp/telemetry')"};
        assert.equal('Countly' in globalThis, false);
        const queuedEvents = [];
        let initialized = false;
        globalThis.window = {Countly: {
          q: {push: event => queuedEvents.push(event)},
          init: () => { initialized = true; },
        }};
        telemetry.initialize({
          appVersion: 'artifact-test',
          provider: {apiKey: 'test-key', serverUrl: 'https://countly.example.test', autoSessionTracking: true},
        });
        assert.equal(initialized, true);
        assert.equal(window.Countly.app_key, 'test-key');
        assert.equal(window.Countly.offline_mode, true);
        assert.equal(window.Countly.require_consent, true);
        assert.deepEqual(queuedEvents, [['track_sessions']]);
        console.log(JSON.stringify(Object.keys(telemetry).sort()));
      `),
    );
    const expectedExports = [
      'addAllConsentFeatures',
      'addConsentFeatures',
      'beginSession',
      'changeDeviceId',
      'disableOfflineMode',
      'enableOfflineMode',
      'endSession',
      'getProviderInstance',
      'initialize',
      'isLoaded',
      'removeAllConsentFeatures',
      'removeConsentFeatures',
      'setUserData',
      'trackClicks',
      'trackEvent',
      'trackPageView',
    ];

    expect(actualExports).toEqual(expectedExports);
  });

  it('resolves the legacy main entry point to CommonJS', () => {
    runNode(`
      import assert from 'node:assert/strict';
      import {createRequire} from 'node:module';
      const require = createRequire(import.meta.url);
      assert.equal(require('./').initialize, require('@wireapp/telemetry').initialize);
      assert.equal(require('@wireapp/telemetry/package.json').name, '@wireapp/telemetry');
    `);
  });

  it('provides usable declarations to ESM and CommonJS TypeScript consumers', () => {
    const consumerDirectory = mkdtempSync(path.join(__dirname, 'consumer-'));
    try {
      const consumerSource = `
        import {initialize, trackEvent, type TelemetryEvent, type TelemetryConsentFeatures} from '@wireapp/telemetry';
        const event: TelemetryEvent<number> = {name: 'example', segmentation: {duration: 1}};
        const consent: TelemetryConsentFeatures = 'sessions';
        initialize({appVersion: 'test', provider: {apiKey: 'test', serverUrl: 'https://example.test'}});
        trackEvent(event);
        // @ts-expect-error Declarations must retain the consent union.
        const invalidConsent: TelemetryConsentFeatures = 'invalid-feature';
        // @ts-expect-error Declarations must retain required event names.
        trackEvent({segmentation: {consent}});
      `;
      writeFileSync(path.join(consumerDirectory, 'consumer.mts'), consumerSource);
      writeFileSync(path.join(consumerDirectory, 'consumer.cts'), consumerSource);
      writeFileSync(
        path.join(consumerDirectory, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {module: 'NodeNext', strict: true, noEmit: true, skipLibCheck: true, types: []},
          include: ['consumer.mts', 'consumer.cts'],
        }),
      );
      execFileSync(process.execPath, [require.resolve('typescript/lib/tsc.js'), '--project', consumerDirectory], {
        cwd: libraryDirectory,
        timeout: 30_000,
      });
    } finally {
      rmSync(consumerDirectory, {recursive: true, force: true});
    }
  });

  it('ships the unmodified Countly browser SDK with deferred initialization', () => {
    const actualEmbed = readFileSync(path.join(libraryDirectory, 'lib/embed.js'));
    const expectedEmbed = readFileSync(require.resolve('countly-sdk-web/lib/countly.min.js'));
    expect(actualEmbed.equals(expectedEmbed)).toBe(true);

    runNode(`
      import assert from 'node:assert/strict';
      import {readFileSync} from 'node:fs';
      import {JSDOM} from 'jsdom';
      const browser = new JSDOM('', {url: 'https://webapp.example.test', runScripts: 'outside-only'});
      try {
        browser.window.eval(readFileSync('lib/embed.js', 'utf8'));
        assert.equal(typeof browser.window.Countly.init, 'function');
        assert.equal(typeof browser.window.Countly.q.push, 'function');
        assert.equal(browser.window.Countly.app_key, undefined);
      } finally {
        browser.window.close();
      }
    `);
  });

  it('copies the SDK to the server static asset path', () => {
    const serverOutputDirectory = mkdtempSync(path.join(tmpdir(), 'telemetry-server-assets-'));
    try {
      execFileSync(process.execPath, [path.join(workspaceDirectory, 'apps/server/bin/copy_server_assets.js')], {
        cwd: workspaceDirectory,
        env: {...process.env, WIRE_WEBAPP_SERVER_OUTPUT_PATH: serverOutputDirectory},
        timeout: 30_000,
      });
      const actualEmbed = readFileSync(path.join(serverOutputDirectory, 'libs/wire/telemetry/embed.js'));
      const expectedEmbed = readFileSync(require.resolve('countly-sdk-web/lib/countly.min.js'));
      expect(actualEmbed.equals(expectedEmbed)).toBe(true);
    } finally {
      rmSync(serverOutputDirectory, {recursive: true, force: true});
    }
  });

  it('copies the original Countly SDK on repeated runs', () => {
    const assetScript = path.join(libraryDirectory, 'bin/copyAssets.mts');
    execFileSync(process.execPath, [assetScript], {timeout: 30_000});
    execFileSync(process.execPath, [assetScript], {timeout: 30_000});

    const actualEmbed = readFileSync(path.join(libraryDirectory, 'lib/embed.js'));
    const expectedEmbed = readFileSync(require.resolve('countly-sdk-web/lib/countly.min.js'));
    expect(actualEmbed.equals(expectedEmbed)).toBe(true);
  });
});
