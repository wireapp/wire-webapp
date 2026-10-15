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
 */

import type {BrowserContext} from '@playwright/test';
import {noop} from 'noop-esm';
import {
  createRspackRuntimeDiagnostics,
  getRspackRuntimeCompatibilityIssues,
  installRspackBuildRoutes,
  isRspackStaticAssetPath,
} from '../e2e_tests/utils/rspackBuildRouting';
import type {RspackRuntimeVerificationContext} from '../e2e_tests/utils/rspackBuildRouting';

const rspackRouteOptions = {
  applicationOrigin: 'https://wire.test',
  buildDirectoryPath: '/tmp/rspack-build',
} as const;

const requiredEntryScriptPaths = ['/min/auth.js', '/min/app.js'] as const;

type CreateRspackRuntimeContextOptions = {
  readonly servedAssetPaths: readonly string[];
  readonly successfulRspackScriptPaths: readonly string[];
  readonly missingAssetPaths: readonly string[];
  readonly failedRspackAssetResponses: readonly string[];
};

function createRspackRuntimeContext(options: CreateRspackRuntimeContextOptions): RspackRuntimeVerificationContext {
  const diagnostics = createRspackRuntimeDiagnostics();
  options.successfulRspackScriptPaths.forEach(scriptPath => {
    diagnostics.successfulRspackScriptPaths.add(scriptPath);
  });
  diagnostics.failedRspackAssetResponses.push(...options.failedRspackAssetResponses);

  return {
    diagnostics,
    routeState: {
      missingAssetPaths: [...options.missingAssetPaths],
      servedAssetPaths: new Set(options.servedAssetPaths),
    },
  };
}

describe('isRspackStaticAssetPath', () => {
  it.each(['/audio/notification.mp3', '/assets/app-icon.svg', '/min/auth.js', '/worker/video.js'])(
    'routes application build asset %s to Rspack output',
    requestPathname => {
      expect(isRspackStaticAssetPath(requestPathname)).toBe(true);
    },
  );

  it.each(['/auth/', '/config.js', '/libs/wire/telemetry/embed.js', '/api-version', '/backend/api/users'])(
    'leaves application and backend route %s on the configured test server',
    requestPathname => {
      expect(isRspackStaticAssetPath(requestPathname)).toBe(false);
    },
  );
});

describe('installRspackBuildRoutes', () => {
  it('waits until asynchronous route registration completes', async () => {
    let completeRouteRegistration: () => void = noop;
    const routeRegistration = new Promise<void>(resolve => {
      completeRouteRegistration = resolve;
    });
    let routeRegistrationCompleted = false;
    let routeInstallationCompleted = false;
    const browserContext = {
      route: async (): Promise<void> => {
        await routeRegistration;
        routeRegistrationCompleted = true;
      },
    } as unknown as BrowserContext;

    async function waitForRouteInstallation(): Promise<void> {
      await installRspackBuildRoutes(browserContext, rspackRouteOptions);
      routeInstallationCompleted = true;
    }

    const routeInstallation = waitForRouteInstallation();
    await Promise.resolve();

    expect(routeRegistrationCompleted).toBe(false);
    expect(routeInstallationCompleted).toBe(false);

    completeRouteRegistration();
    await routeInstallation;

    expect(routeRegistrationCompleted).toBe(true);
    expect(routeInstallationCompleted).toBe(true);
  });

  it('propagates asynchronous route registration failures', async () => {
    const registrationError = new Error('Route registration failed');
    const routeRegistration = Promise.reject<void>(registrationError);
    const routeRegistrationFailure = expect(routeRegistration).rejects.toBe(registrationError);
    const browserContext = {
      route: (): Promise<void> => {
        return routeRegistration;
      },
    } as unknown as BrowserContext;
    const routeInstallation = installRspackBuildRoutes(browserContext, rspackRouteOptions);

    await routeRegistrationFailure;
    await expect(Promise.resolve(routeInstallation)).rejects.toBe(registrationError);
  });
});

describe('getRspackRuntimeCompatibilityIssues', () => {
  it('accepts entry scripts served locally and loaded successfully', () => {
    const rspackRuntimeContext = createRspackRuntimeContext({
      failedRspackAssetResponses: [],
      missingAssetPaths: [],
      servedAssetPaths: requiredEntryScriptPaths,
      successfulRspackScriptPaths: requiredEntryScriptPaths,
    });

    const actualIssues = getRspackRuntimeCompatibilityIssues({
      requiredEntryScriptPaths,
      rspackContexts: [rspackRuntimeContext],
    });

    expect(actualIssues).toEqual([]);
  });

  it('rejects successful deployed script responses without local interception evidence', () => {
    const rspackRuntimeContext = createRspackRuntimeContext({
      failedRspackAssetResponses: [],
      missingAssetPaths: [],
      servedAssetPaths: [],
      successfulRspackScriptPaths: requiredEntryScriptPaths,
    });

    const actualIssues = getRspackRuntimeCompatibilityIssues({
      requiredEntryScriptPaths,
      rspackContexts: [rspackRuntimeContext],
    });

    expect(actualIssues).toContain(
      'Browser context 1: Required entry script was not served from the local Rspack build: /min/auth.js',
    );
    expect(actualIssues).toContain(
      'Browser context 1: Required entry script was not served from the local Rspack build: /min/app.js',
    );
  });

  it('rejects a missing local entry script', () => {
    const rspackRuntimeContext = createRspackRuntimeContext({
      failedRspackAssetResponses: [],
      missingAssetPaths: ['/min/app.js'],
      servedAssetPaths: ['/min/auth.js'],
      successfulRspackScriptPaths: ['/min/auth.js'],
    });

    const actualIssues = getRspackRuntimeCompatibilityIssues({
      requiredEntryScriptPaths,
      rspackContexts: [rspackRuntimeContext],
    });

    expect(actualIssues).toContain('Browser context 1: Local Rspack asset is missing: /min/app.js');
    expect(actualIssues).toContain(
      'Browser context 1: Required entry script was not served from the local Rspack build: /min/app.js',
    );
  });

  it('rejects failed local asset responses', () => {
    const rspackRuntimeContext = createRspackRuntimeContext({
      failedRspackAssetResponses: ['404 script /min/app.js'],
      missingAssetPaths: [],
      servedAssetPaths: requiredEntryScriptPaths,
      successfulRspackScriptPaths: ['/min/auth.js'],
    });

    const actualIssues = getRspackRuntimeCompatibilityIssues({
      requiredEntryScriptPaths,
      rspackContexts: [rspackRuntimeContext],
    });

    expect(actualIssues).toContain('Browser context 1: 404 script /min/app.js');
    expect(actualIssues).toContain(
      'Browser context 1: Required entry script did not receive a successful browser response: /min/app.js',
    );
  });

  it('does not combine entry script evidence from separate browser contexts', () => {
    const authenticationContext = createRspackRuntimeContext({
      failedRspackAssetResponses: [],
      missingAssetPaths: [],
      servedAssetPaths: ['/min/auth.js'],
      successfulRspackScriptPaths: ['/min/auth.js'],
    });
    const applicationContext = createRspackRuntimeContext({
      failedRspackAssetResponses: [],
      missingAssetPaths: [],
      servedAssetPaths: ['/min/app.js'],
      successfulRspackScriptPaths: ['/min/app.js'],
    });

    const actualIssues = getRspackRuntimeCompatibilityIssues({
      requiredEntryScriptPaths,
      rspackContexts: [authenticationContext, applicationContext],
    });

    expect(actualIssues).toContain(
      'Browser context 1: Required entry script was not served from the local Rspack build: /min/app.js',
    );
    expect(actualIssues).toContain(
      'Browser context 2: Required entry script was not served from the local Rspack build: /min/auth.js',
    );
  });
});
