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

import type {APIResponse, BrowserContext, Route} from '@playwright/test';
import {isUndefined} from '@sindresorhus/is';
import type {BuildMetadata, Env} from '@wireapp/config';
import {noop} from 'noop-esm';
import {Result} from 'true-myth';
import {
  createRspackRuntimeConfiguration,
  createRspackRuntimeDiagnostics,
  generateRspackRuntimeConfiguration,
  getRspackRuntimeCompatibilityIssues,
  installRspackBuildRoutes,
  isRspackRuntimeConfigurationUrl,
  isRspackStaticAssetPath,
} from '../e2e_tests/utils/rspackBuildRouting';
import type {RspackRuntimeVerificationContext} from '../e2e_tests/utils/rspackBuildRouting';

const buildMetadata: BuildMetadata = {
  assetVersion: 'test-version',
  builtAt: '2026-01-01T00:00:00.000Z',
  commit: 'test-commit',
  version: 'test-version',
};

const runtimeEnvironment = {
  MAX_API_VERSION: '',
} as Env;

const generatedRuntimeConfiguration = generateRspackRuntimeConfiguration({
  buildMetadata,
  environment: runtimeEnvironment,
  urls: {
    api: 'https://generated-api.example.test',
    base: 'https://generated-app.example.test',
    ws: 'wss://generated-ws.example.test',
  },
});

const rspackRouteOptions = {
  applicationOrigin: 'https://wire.test',
  buildDirectoryPath: '/tmp/rspack-build',
  generatedRuntimeConfiguration,
} as const;

const requiredEntryScriptPaths = ['/min/auth.js', '/min/app.js'] as const;

type CreateRspackRuntimeContextOptions = {
  readonly servedAssetPaths: readonly string[];
  readonly successfulRspackScriptPaths: readonly string[];
  readonly missingAssetPaths: readonly string[];
  readonly failedRspackAssetResponses: readonly string[];
  readonly generatedRuntimeConfigurationServed: boolean;
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
      generatedRuntimeConfigurationServed: options.generatedRuntimeConfigurationServed,
      missingAssetPaths: [...options.missingAssetPaths],
      servedAssetPaths: new Set(options.servedAssetPaths),
      runtimeConfigurationIssues: [],
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

describe('isRspackRuntimeConfigurationUrl', () => {
  it('selects config.js at the QA application origin for local runtime configuration generation', () => {
    const actualSelection = isRspackRuntimeConfigurationUrl(
      new URL('/config.js?version=old', rspackRouteOptions.applicationOrigin),
      rspackRouteOptions.applicationOrigin,
    );

    expect(actualSelection).toBe(true);
  });

  it('leaves config.js from other origins untouched', () => {
    const actualSelection = isRspackRuntimeConfigurationUrl(
      new URL('/config.js', 'https://other.example.test'),
      rspackRouteOptions.applicationOrigin,
    );

    expect(actualSelection).toBe(false);
  });
});

describe('createRspackRuntimeConfiguration', () => {
  it('fills fields missing from the deployed config with the current generated config and preserves QA endpoints', () => {
    const deployedRuntimeConfiguration = {
      APP_BASE: 'https://qa-app.example.test',
      BACKEND_REST: 'https://qa-api.example.test',
      BACKEND_WS: 'wss://qa-ws.example.test',
      FEATURE: {USE_CORE_CRYPTO: true},
    };
    const deployedRuntimeConfigurationScript = `window.wire = window.wire || {}; window.wire.env = ${JSON.stringify(deployedRuntimeConfiguration)};`;
    const actualRuntimeConfiguration = createRspackRuntimeConfiguration({
      deployedRuntimeConfigurationScript,
      generatedRuntimeConfiguration,
    }).map(runtimeConfiguration => {
      return {
        applicationBase: runtimeConfiguration.APP_BASE,
        backendRest: runtimeConfiguration.BACKEND_REST,
        backendWebSocket: runtimeConfiguration.BACKEND_WS,
        maximumApiVersion: runtimeConfiguration.MAX_API_VERSION,
        useCoreCrypto: (runtimeConfiguration.FEATURE as {USE_CORE_CRYPTO: boolean}).USE_CORE_CRYPTO,
      };
    });

    expect(actualRuntimeConfiguration).toEqual(
      Result.ok({
        applicationBase: deployedRuntimeConfiguration.APP_BASE,
        backendRest: deployedRuntimeConfiguration.BACKEND_REST,
        backendWebSocket: deployedRuntimeConfiguration.BACKEND_WS,
        maximumApiVersion: generatedRuntimeConfiguration.MAX_API_VERSION,
        useCoreCrypto: deployedRuntimeConfiguration.FEATURE.USE_CORE_CRYPTO,
      }),
    );
  });

  it('rejects a deployed config without the required backend endpoints', () => {
    const deployedRuntimeConfigurationScript = `window.wire.env = ${JSON.stringify({APP_BASE: 'https://qa-app.example.test'})};`;
    const actualRuntimeConfiguration = createRspackRuntimeConfiguration({
      deployedRuntimeConfigurationScript,
      generatedRuntimeConfiguration,
    });

    expect(actualRuntimeConfiguration).toEqual(
      Result.err({kind: 'missingRequiredEndpoint', endpointName: 'BACKEND_REST'}),
    );
  });
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

  it('fulfills same-origin config.js with the generated runtime config instead of continuing to QA', async () => {
    type RegisteredRouteHandler = (route: Route) => Promise<void>;

    let registeredRouteHandler: RegisteredRouteHandler | undefined;
    const browserContext = {
      route: async (_url: string, routeHandler: RegisteredRouteHandler): Promise<void> => {
        registeredRouteHandler = routeHandler;
      },
    } as unknown as BrowserContext;
    const deployedRuntimeConfiguration = {
      APP_BASE: rspackRouteOptions.applicationOrigin,
      BACKEND_REST: 'https://qa-api.example.test',
      BACKEND_WS: 'wss://qa-ws.example.test',
    };
    const deployedRuntimeConfigurationResponse = {
      ok: (): boolean => {
        return true;
      },
      status: (): number => {
        return 200;
      },
      text: async (): Promise<string> => {
        return `window.wire.env = ${JSON.stringify(deployedRuntimeConfiguration)};`;
      },
    } as APIResponse;
    let requestWasFulfilled = false;
    let requestWasContinued = false;
    const browserRoute = {
      request: () => {
        return {
          url: () => {
            return `${rspackRouteOptions.applicationOrigin}/config.js`;
          },
        };
      },
      fetch: async (): Promise<APIResponse> => {
        return deployedRuntimeConfigurationResponse;
      },
      fulfill: async (): Promise<void> => {
        requestWasFulfilled = true;
      },
      continue: async (): Promise<void> => {
        requestWasContinued = true;
      },
    } as unknown as Route;
    const routeState = await installRspackBuildRoutes(browserContext, rspackRouteOptions);

    if (isUndefined(registeredRouteHandler)) {
      throw new Error('Rspack build route handler was not installed.');
    }

    await registeredRouteHandler(browserRoute);

    expect(requestWasFulfilled).toBe(true);
    expect(requestWasContinued).toBe(false);
    expect(routeState.generatedRuntimeConfigurationServed).toBe(true);
    expect(routeState.runtimeConfigurationIssues).toEqual([]);
  });
});

describe('getRspackRuntimeCompatibilityIssues', () => {
  it('accepts entry scripts served locally and loaded successfully', () => {
    const rspackRuntimeContext = createRspackRuntimeContext({
      failedRspackAssetResponses: [],
      generatedRuntimeConfigurationServed: true,
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
      generatedRuntimeConfigurationServed: true,
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
      generatedRuntimeConfigurationServed: true,
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
      generatedRuntimeConfigurationServed: true,
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
      generatedRuntimeConfigurationServed: true,
      missingAssetPaths: [],
      servedAssetPaths: ['/min/auth.js'],
      successfulRspackScriptPaths: ['/min/auth.js'],
    });
    const applicationContext = createRspackRuntimeContext({
      failedRspackAssetResponses: [],
      generatedRuntimeConfigurationServed: true,
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

  it('requires the generated runtime configuration to be served', () => {
    const rspackRuntimeContext = createRspackRuntimeContext({
      failedRspackAssetResponses: [],
      generatedRuntimeConfigurationServed: false,
      missingAssetPaths: [],
      servedAssetPaths: requiredEntryScriptPaths,
      successfulRspackScriptPaths: requiredEntryScriptPaths,
    });

    const actualIssues = getRspackRuntimeCompatibilityIssues({
      requiredEntryScriptPaths,
      rspackContexts: [rspackRuntimeContext],
    });

    expect(actualIssues).toContain(
      'Browser context 1: Generated Rspack runtime configuration was not served from the QA application origin.',
    );
  });
});
