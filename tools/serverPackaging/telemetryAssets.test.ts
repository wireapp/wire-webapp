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
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

const workspaceDirectory = path.resolve(__dirname, '../..');
const upstreamSdkPath = require.resolve('countly-sdk-web/lib/countly.min.js');

describe('standalone telemetry SDK', () => {
  it('loads the original SDK into window without initializing it', () => {
    execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        `
      import assert from 'node:assert/strict';
      import {readFileSync} from 'node:fs';
      import {JSDOM} from 'jsdom';
      const browser = new JSDOM('', {url: 'https://webapp.example.test', runScripts: 'outside-only'});
      try {
        browser.window.eval(readFileSync(${JSON.stringify(upstreamSdkPath)}, 'utf8'));
        assert.equal(typeof browser.window.Countly.init, 'function');
        assert.equal(typeof browser.window.Countly.q.push, 'function');
        assert.equal(browser.window.Countly.app_key, undefined);
      } finally {
        browser.window.close();
      }
    `,
      ],
      {cwd: workspaceDirectory, timeout: 30_000},
    );
  });

  it('copies the original SDK to the deployed URL on repeated server asset builds', () => {
    const serverOutputDirectory = mkdtempSync(path.join(tmpdir(), 'telemetry-server-assets-'));
    try {
      const expectedEmbed = readFileSync(upstreamSdkPath);
      const deployedEmbedPath = path.join(serverOutputDirectory, 'libs/wire/telemetry/embed.js');

      for (const buildNumber of [1, 2]) {
        execFileSync(process.execPath, [path.join(workspaceDirectory, 'apps/server/bin/copy_server_assets.js')], {
          cwd: workspaceDirectory,
          env: {...process.env, WIRE_WEBAPP_SERVER_OUTPUT_PATH: serverOutputDirectory},
          timeout: 30_000,
        });

        const actualEmbed = readFileSync(deployedEmbedPath);
        expect({buildNumber, matchesUpstream: actualEmbed.equals(expectedEmbed)}).toEqual({
          buildNumber,
          matchesUpstream: true,
        });
        writeFileSync(deployedEmbedPath, 'stale asset');
      }
    } finally {
      rmSync(serverOutputDirectory, {recursive: true, force: true});
    }
  });

  it('preserves event and consent types for source consumers', () => {
    const consumerDirectory = mkdtempSync(path.join(tmpdir(), 'telemetry-type-consumer-'));
    const telemetrySourcePath = path.join(workspaceDirectory, 'apps/webapp/src/script/telemetry/telemetry.ts');
    try {
      writeFileSync(
        path.join(consumerDirectory, 'consumer.ts'),
        `
        import {initialize, trackEvent, type TelemetryEvent, type TelemetryConsentFeatures} from ${JSON.stringify(telemetrySourcePath)};
        const event: TelemetryEvent<number> = {name: 'example', segmentation: {duration: 1}};
        const consent: TelemetryConsentFeatures = 'sessions';
        initialize({appVersion: 'test', provider: {apiKey: 'test', serverUrl: 'https://example.test'}});
        trackEvent(event);
        // @ts-expect-error Source types must retain the consent union.
        const invalidConsent: TelemetryConsentFeatures = 'invalid-feature';
        // @ts-expect-error Source types must retain required event names.
        trackEvent({segmentation: {consent}});
        // @ts-expect-error Source types must retain generic segmentation values.
        const invalidEvent: TelemetryEvent<number> = {name: 'example', segmentation: {duration: 'one'}};
      `,
      );
      writeFileSync(
        path.join(consumerDirectory, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            module: 'NodeNext',
            target: 'es2024',
            lib: ['es2024', 'dom'],
            strict: true,
            noEmit: true,
            skipLibCheck: true,
            types: [],
            allowImportingTsExtensions: true,
          },
          include: ['consumer.ts'],
        }),
      );
      execFileSync(process.execPath, [require.resolve('typescript/lib/tsc.js'), '--project', consumerDirectory], {
        cwd: workspaceDirectory,
        timeout: 30_000,
      });
    } finally {
      rmSync(consumerDirectory, {recursive: true, force: true});
    }
  });
});
