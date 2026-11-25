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

import {expect, test} from '@playwright/test';
import type {Page, Response} from '@playwright/test';
import {isEmptyArray} from '@sindresorhus/is';
import {noop} from 'noop-esm';
import {match} from 'ts-pattern';
import {Maybe} from 'true-myth';

import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {z} from 'zod';

import {previewDefaultEnabledStartupFeatureToggleNames} from '../../src/script/featureToggles/startupFeatureToggleNames';

type RuntimeDiagnostics = {
  readonly uncaughtPageErrors: string[];
  readonly failedLocalRequests: string[];
  readonly failedLocalResponses: string[];
  readonly localScriptResponses: Map<string, number>;
};

type RuntimeDiagnosticsOptions = {
  readonly page: Page;
  readonly baseUrl: string;
};

type RuntimeAssertionOptions = {
  readonly diagnostics: RuntimeDiagnostics;
  readonly buildProjectName: string;
};

type SuccessfulScriptsOptions = {
  readonly diagnostics: RuntimeDiagnostics;
  readonly buildProjectName: string;
  readonly requiredScriptPaths: readonly string[];
};

function captureRuntimeDiagnostics(options: RuntimeDiagnosticsOptions): RuntimeDiagnostics {
  const {page, baseUrl} = options;
  const baseOrigin = new URL(baseUrl).origin;
  const diagnostics: RuntimeDiagnostics = {
    failedLocalRequests: [],
    failedLocalResponses: [],
    localScriptResponses: new Map(),
    uncaughtPageErrors: [],
  };

  page.on('pageerror', error => {
    diagnostics.uncaughtPageErrors.push(Maybe.of(error.stack).unwrapOr(error.message));
  });
  page.on('requestfailed', request => {
    const requestUrl = new URL(request.url());
    const failureMessage = Maybe.of(request.failure())
      .map(requestFailure => {
        return requestFailure.errorText;
      })
      .unwrapOr('request failed');

    return match(requestUrl.origin)
      .with(baseOrigin, () => {
        diagnostics.failedLocalRequests.push(`${request.resourceType()} ${requestUrl.pathname}: ${failureMessage}`);
      })
      .otherwise(noop);
  });
  page.on('response', (response: Response) => {
    const responseUrl = new URL(response.url());
    return match(responseUrl.origin)
      .with(baseOrigin, () => {
        const resourceType = response.request().resourceType();
        match(resourceType)
          .with('script', () => {
            diagnostics.localScriptResponses.set(responseUrl.pathname, response.status());
          })
          .otherwise(noop);
        match(response.ok())
          .with(false, () => {
            diagnostics.failedLocalResponses.push(`${response.status()} ${resourceType} ${responseUrl.pathname}`);
          })
          .with(true, () => {
            return undefined;
          })
          .exhaustive();
      })
      .otherwise(noop);
  });

  return diagnostics;
}

function expectNoRuntimeFailures(options: RuntimeAssertionOptions): void {
  const {diagnostics, buildProjectName} = options;

  expect(diagnostics.uncaughtPageErrors, `${buildProjectName} uncaught page errors`).toEqual([]);
  expect(diagnostics.failedLocalRequests, `${buildProjectName} failed local requests`).toEqual([]);
  expect(diagnostics.failedLocalResponses, `${buildProjectName} failed local responses`).toEqual([]);
}

async function expectSuccessfulScripts(options: SuccessfulScriptsOptions): Promise<void> {
  const {diagnostics, buildProjectName, requiredScriptPaths} = options;

  await Promise.all(
    requiredScriptPaths.map(async scriptPath => {
      await expect
        .poll(
          () => {
            return Maybe.of(diagnostics.localScriptResponses.get(scriptPath));
          },
          {
            message: `${buildProjectName} should load ${scriptPath}`,
          },
        )
        .toEqual(Maybe.just(200));
    }),
  );
}

test('loads the application entry points and redirects an unauthenticated visitor to authentication', async ({
  page,
}, testInfo) => {
  const baseUrl = Maybe.of(testInfo.project.use.baseURL).match({
    Just: projectBaseUrl => {
      return projectBaseUrl;
    },
    Nothing: () => {
      throw new Error(`Playwright project '${testInfo.project.name}' must define a base URL`);
    },
  });

  const diagnostics = captureRuntimeDiagnostics({page, baseUrl});
  const documentResponse = await page.goto('/');
  const documentStatus = Maybe.of(documentResponse).map(response => {
    return response.status();
  });

  expect(documentStatus, `${testInfo.project.name} application document status`).toEqual(Maybe.just(200));
  await expect(page).toHaveURL(/\/auth\/?(?:\?[^#]*)?(?:#\/)?$/);
  const expectedDefaultNames =
    testInfo.project.name === 'rspack-internal' ? previewDefaultEnabledStartupFeatureToggleNames : [];
  expect(new URL(page.url()).searchParams.get('enabled-features')).toBe(
    isEmptyArray(expectedDefaultNames) ? null : expectedDefaultNames.join(','),
  );
  await expectSuccessfulScripts({
    diagnostics,
    buildProjectName: testInfo.project.name,
    requiredScriptPaths: [
      '/min/basicBrowserFeatureCheck.js',
      '/min/checkBrowser.js',
      '/min/loader.js',
      '/min/dexie.js',
      '/min/vendor.js',
      '/min/runtime.js',
      '/min/app.js',
      '/libs/wire/telemetry/embed.js',
    ],
  });

  const persistenceWorkerPath = '/min/wire-browser-log-persistence.js';
  await expect
    .poll(() => {
      return page.workers().map(worker => {
        return new URL(worker.url()).pathname;
      });
    })
    .toContain(persistenceWorkerPath);

  // Redirecting from the main app can cancel its worker request before auth starts its own worker.
  const failedLocalRequests = diagnostics.failedLocalRequests.filter(failure => {
    return failure !== `script ${persistenceWorkerPath}: net::ERR_ABORTED`;
  });
  expectNoRuntimeFailures({
    diagnostics: {
      uncaughtPageErrors: diagnostics.uncaughtPageErrors,
      failedLocalRequests,
      failedLocalResponses: diagnostics.failedLocalResponses,
      localScriptResponses: diagnostics.localScriptResponses,
    },
    buildProjectName: testInfo.project.name,
  });
});

for (const entryPath of ['/', '/auth']) {
  for (const isDesktopApp of [false, true]) {
    test(`shows ${isDesktopApp ? 'Desktop' : 'browser'} upgrade instructions before loading ${entryPath} without JSPI`, async ({
      page,
    }, testInfo) => {
      const baseUrl = Maybe.of(testInfo.project.use.baseURL).unwrapOr('');
      const diagnostics = captureRuntimeDiagnostics({page, baseUrl});
      const capabilityErrors: string[] = [];
      page.on('console', message => {
        if (message.type() === 'error') {
          capabilityErrors.push(message.text());
        }
      });
      await page.addInitScript(desktop => {
        Reflect.deleteProperty(WebAssembly, 'Suspending');
        Reflect.deleteProperty(WebAssembly, 'promising');
        if (desktop) {
          Object.defineProperty(navigator, 'userAgent', {
            value: 'Mozilla/5.0 Chrome/136.0.0.0 Electron/36.0.0 Wire/3.0.0',
            configurable: true,
          });
        }
      }, isDesktopApp);

      await page.goto(entryPath);
      const dialog = page.getByRole('dialog', {
        name: isDesktopApp
          ? 'Update your Desktop app to continue using Wire.'
          : 'Update your browser to continue using Wire.',
      });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('button')).toHaveCount(0);
      await expect(dialog).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(dialog).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(dialog).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeVisible();
      expect(capabilityErrors).toContainEqual(expect.stringContaining('JS Promise Integration'));
      expectNoRuntimeFailures({diagnostics, buildProjectName: testInfo.project.name});
    });
  }
}

for (const entryPath of ['/', '/auth']) {
  test(`reports a rejected JSPI probe and shows upgrade instructions on ${entryPath}`, async ({page}, testInfo) => {
    const baseUrl = Maybe.of(testInfo.project.use.baseURL).unwrapOr('');
    const diagnostics = captureRuntimeDiagnostics({page, baseUrl});
    const capabilityErrors: string[] = [];
    page.on('console', message => {
      if (message.type() === 'error') {
        capabilityErrors.push(message.text());
      }
    });
    await page.addInitScript(() => {
      Object.defineProperty(globalThis, 'WebAssembly', {
        configurable: true,
        value: new Proxy(WebAssembly, {
          has(target, property) {
            if (property === 'Suspending') {
              throw new Error('simulated JSPI detection failure');
            }
            return Reflect.has(target, property);
          },
        }),
      });
    });

    await page.goto(entryPath);
    await expect(page.getByRole('dialog', {name: 'Update your browser to continue using Wire.'})).toBeVisible();
    expect(capabilityErrors).toContainEqual(expect.stringContaining('JSPI feature detection failed'));
    expect(capabilityErrors).toContainEqual(expect.stringContaining('simulated JSPI detection failure'));
    expect(capabilityErrors).toContainEqual(
      expect.stringContaining('missing required browser capabilities: JS Promise Integration'),
    );
    expectNoRuntimeFailures({diagnostics, buildProjectName: testInfo.project.name});
  });
}

test('reports missing filesystem support when JSPI is available', async ({page}) => {
  const capabilityErrors: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error') {
      capabilityErrors.push(message.text());
    }
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator.storage, 'getDirectory', {value: undefined, configurable: true});
  });

  await page.goto('/');
  await expect(page.getByRole('dialog', {name: 'Update your browser to continue using Wire.'})).toBeVisible();
  expect(capabilityErrors).toContainEqual(expect.stringContaining('Origin Private File System'));
  expect(capabilityErrors).not.toContainEqual(expect.stringContaining('JS Promise Integration'));
});

test('starts when service-worker cleanup finishes after DOMContentLoaded', async ({page}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        async getRegistrations() {
          await new Promise<void>(resolve => {
            document.addEventListener(
              'DOMContentLoaded',
              () => {
                resolve();
              },
              {once: true},
            );
          });

          return [];
        },
      },
    });
  });

  await page.goto('/');

  await expect(page).toHaveURL(/\/auth\//);
  await expect(page.getByRole('button', {name: 'Log in'})).toBeVisible();
});

test('redirects to authentication with the explicit feature selection while service-worker cleanup never settles', async ({
  page,
}) => {
  const uncaughtPageErrors: string[] = [];
  page.on('pageerror', error => {
    uncaughtPageErrors.push(error.message);
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistrations() {
          return Promise.withResolvers<never>().promise;
        },
      },
    });
  });

  await page.goto('/?enabled-features=for-tests-only&hl=en');

  await expect(page).toHaveURL(/\/auth\//);
  await expect(page.getByRole('button', {name: 'Log in'})).toBeVisible();
  expect(new URL(page.url()).searchParams.get('enabled-features')).toBe('for-tests-only');
  expect(new URL(page.url()).searchParams.get('hl')).toBe('en');
  expect(uncaughtPageErrors).toEqual([]);
});

test('redirects to authentication with an empty selection while cache cleanup never settles', async ({page}) => {
  const uncaughtPageErrors: string[] = [];
  page.on('pageerror', error => {
    uncaughtPageErrors.push(error.message);
  });
  await page.addInitScript(() => {
    Object.defineProperty(window, 'caches', {
      value: {
        keys() {
          return Promise.withResolvers<never>().promise;
        },
      },
    });
  });

  await page.goto('/?enabled-features=');

  await expect(page).toHaveURL(/\/auth\//);
  await expect(page.getByRole('button', {name: 'Log in'})).toBeVisible();
  expect(new URL(page.url()).searchParams.get('enabled-features')).toBe('');
  expect(uncaughtPageErrors).toEqual([]);
});

test('reports rejected cleanup through Desktop fallback without an unhandled rejection or blocked authentication', async ({
  page,
}) => {
  const reportedErrors: string[] = [];
  const uncaughtPageErrors: string[] = [];
  const releaseAuthenticationNavigation = Promise.withResolvers<void>();
  // Keep the startup document alive until Playwright receives its console record.
  await page.route('**/auth/?**', async route => {
    await releaseAuthenticationNavigation.promise;
    await route.continue();
  });
  page.on('pageerror', error => {
    uncaughtPageErrors.push(error.message);
  });
  page.on('console', message => {
    if (message.type() === 'error') {
      reportedErrors.push(message.text());
    }
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: `${navigator.userAgent} Wire/3.46.0 Electron/38.0.0`,
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistrations() {
          return Promise.reject(new Error('simulated cleanup failure'));
        },
      },
    });
  });

  try {
    await page.goto('/?debugLogging=*', {waitUntil: 'commit'});
    await expect
      .poll(() => {
        return reportedErrors
          .filter(message => {
            return message.startsWith('{');
          })
          .map(message => {
            return JSON.parse(message) as Record<string, unknown>;
          });
      })
      .toContainEqual(
        expect.objectContaining({
          level: 50,
          component: '@wireapp/webapp/FireAndForgetInvoker',
          msg: 'failed to execute fire-and-forget action',
          error: expect.objectContaining({message: 'simulated cleanup failure'}),
        }),
      );
  } finally {
    releaseAuthenticationNavigation.resolve();
  }

  await expect(page).toHaveURL(/\/auth\//);
  await expect(page.getByRole('button', {name: 'Log in'})).toBeVisible();
  expect(uncaughtPageErrors).toEqual([]);
});

test('warns about rejected authentication cleanup when structured logging is disabled', async ({page}) => {
  const reportedWarnings: string[] = [];
  const uncaughtPageErrors: string[] = [];
  page.on('console', message => {
    if (message.type() === 'warning') {
      reportedWarnings.push(message.text());
    }
  });
  page.on('pageerror', error => {
    uncaughtPageErrors.push(error.message);
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistrations() {
          return Promise.reject(new Error('simulated authentication cleanup failure'));
        },
      },
    });
  });

  await page.goto('/auth?enabled-features=');
  await expect(page.getByRole('button', {name: 'Log in'})).toBeVisible();

  expect(reportedWarnings).toContainEqual(
    expect.stringContaining('Legacy service worker cleanup failed; continuing application startup.'),
  );
  expect(uncaughtPageErrors).toEqual([]);
});

test('bundles the application and authentication entrypoints selected for the artifact', async ({
  request,
}, testInfo) => {
  const expectedEntrypoint = testInfo.project.name === 'rspack-internal' ? 'preview' : 'release';
  const excludedEntrypoint = testInfo.project.name === 'rspack-internal' ? 'release' : 'preview';

  for (const {bundle, directory} of [
    {bundle: 'app', directory: 'main'},
    {bundle: 'auth', directory: 'auth'},
  ]) {
    const sourceMapResponse = await request.get(`/min/${bundle}.js.map`);
    const sourceMapText = await sourceMapResponse.text();
    expect(sourceMapResponse.ok()).toBe(true);
    expect(sourceMapText).toContain(`/${directory}/${expectedEntrypoint}Entrypoint.tsx`);
    expect(sourceMapText).not.toContain(`/${directory}/${excludedEntrypoint}Entrypoint.tsx`);
    expect(sourceMapText).not.toContain('/browser/coreCryptoUpgradeModal.tsx');
    expect(sourceMapText).not.toContain('/browser/showCoreCryptoUpgrade.tsx');
    expect(sourceMapText).not.toContain('/localization/Localizer.ts');
    expect(sourceMapText).not.toContain('/util/util.ts');
  }
});

for (const scenario of [
  {label: 'default', configuredDebug: false, selection: ''},
  {label: 'configured DEBUG', configuredDebug: true, selection: ''},
  {label: 'explicit namespaces', configuredDebug: false, selection: '*,-Excluded'},
]) {
  test(`applies ${scenario.label} logging to both startup pages`, async ({page}, testInfo) => {
    const {configuredDebug, selection} = scenario;
    const developerConsoleEnabled = testInfo.project.name === 'rspack-internal';
    await page.addInitScript(() => {
      Object.defineProperty(window, 'showSaveFilePicker', {
        configurable: true,
        value: async function showSaveFilePicker(): Promise<FileSystemFileHandle> {
          throw new DOMException('Synthetic save dialog cancellation', 'AbortError');
        },
      });
    });
    await page.route('**/config.js', async route => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body: `${await response.text()} window.wire.env.FEATURE.ENABLE_DEBUG = ${configuredDebug};`,
      });
    });
    await page.addInitScript(() => {
      if (location.pathname === '/') {
        window.addEventListener(
          'pagehide',
          () => {
            sessionStorage.setItem('mainDebugSelection', localStorage.getItem('debug') ?? '');
          },
          {once: true},
        );
      }
    });
    const startupRecords: string[] = [];
    page.on('console', message => {
      const line = message.text();
      if (line.startsWith('{') && line.includes('"component":"@wireapp/webapp/RuntimeIdentity"')) {
        startupRecords.push(line);
      }
    });
    const search = new URLSearchParams({'enabled-features': ''});
    if (selection !== '') {
      search.set('debugLogging', selection);
    }
    await page.goto(`/?${search}`);
    await expect(page.getByRole('button', {name: 'Log in'})).toBeVisible();

    const expectedDebug = selection !== '' ? selection : developerConsoleEnabled || configuredDebug ? '*' : '';
    const startupSelections = await page.evaluate(() => {
      return {main: sessionStorage.getItem('mainDebugSelection'), auth: localStorage.getItem('debug') ?? ''};
    });
    expect(startupSelections).toEqual({main: expectedDebug, auth: expectedDebug});
    expect(startupRecords).toHaveLength(developerConsoleEnabled ? 2 : 0);
  });
}

async function expectStartupSelectionSurvivesAuthentication(page: Page, selection: string): Promise<void> {
  await page.goto(`/?enabled-features=${selection}&hl=en`);
  await expect(page).toHaveURL(/\/auth\//);
  expect(new URL(page.url()).searchParams.get('enabled-features')).toBe(selection);
  expect(new URL(page.url()).searchParams.get('hl')).toBe('en');

  await page.getByRole('button', {name: 'Log in'}).click();
  await expect(page).toHaveURL(/#\/login$/);
  expect(new URL(page.url()).searchParams.get('enabled-features')).toBe(selection);
  await page.reload();
  await expect(page.getByPlaceholder('Email or username')).toBeVisible();
  expect(new URL(page.url()).searchParams.get('enabled-features')).toBe(selection);
}

test('preserves an explicit enabled feature through authentication navigation', async ({page}) => {
  await expectStartupSelectionSurvivesAuthentication(page, 'for-tests-only');
});

test('preserves explicit Mark as unread opt-in through authentication and reload', async ({page}) => {
  await expectStartupSelectionSurvivesAuthentication(page, 'mark-as-unread');
});

test('preserves an explicit empty feature selection through authentication navigation', async ({page}) => {
  await expectStartupSelectionSurvivesAuthentication(page, '');
});

test('preserves an unknown feature selection through authentication navigation', async ({page}) => {
  await expectStartupSelectionSurvivesAuthentication(page, 'unknown-feature');
});

test('initializes authentication and navigates to an interactive login form', async ({page}, testInfo) => {
  const baseUrl = Maybe.of(testInfo.project.use.baseURL).match({
    Just: projectBaseUrl => {
      return projectBaseUrl;
    },
    Nothing: () => {
      throw new Error(`Playwright project '${testInfo.project.name}' must define a base URL`);
    },
  });

  const diagnostics = captureRuntimeDiagnostics({page, baseUrl});
  const documentResponse = await page.goto('/auth');
  const documentStatus = Maybe.of(documentResponse).map(response => {
    return response.status();
  });

  expect(documentStatus, `${testInfo.project.name} authentication document status`).toEqual(Maybe.just(200));
  const loginNavigationButton = page.getByRole('button', {name: 'Log in'});
  await expect(loginNavigationButton).toBeVisible();
  await expect(page.getByRole('button', {name: 'Create account'})).toBeVisible();
  await expectSuccessfulScripts({
    diagnostics,
    buildProjectName: testInfo.project.name,
    requiredScriptPaths: [
      '/min/basicBrowserFeatureCheck.js',
      '/min/checkBrowser.js',
      '/min/dexie.js',
      '/min/vendor.js',
      '/min/runtime.js',
      '/min/auth.js',
      '/libs/wire/telemetry/embed.js',
    ],
  });

  await loginNavigationButton.click();
  await expect(page).toHaveURL(/#\/login$/);
  const emailInput = page.getByPlaceholder('Email or username');
  const passwordInput = page.getByPlaceholder('Password');
  await expect(emailInput).toBeVisible();
  await expect(passwordInput).toBeVisible();
  await emailInput.fill('rspack-smoke@example.test');
  await passwordInput.fill('rspack-smoke-password');
  await expect(page.getByRole('button', {name: 'Log in'})).toBeEnabled();
  expectNoRuntimeFailures({diagnostics, buildProjectName: testInfo.project.name});
});

test('serves the unmodified standalone Countly SDK without initializing telemetry', async ({page, request}) => {
  const sdkResponse = await request.get('/libs/wire/telemetry/embed.js');
  const actualSdk = await sdkResponse.body();
  const expectedSdk = readFileSync(require.resolve('countly-sdk-web/lib/countly.min.js'));

  expect(sdkResponse.status()).toBe(200);
  expect(actualSdk.equals(expectedSdk)).toBe(true);

  await page.goto('/auth');
  await expect(page.getByRole('button', {name: 'Create account'})).toBeVisible();
  const providerState = await page.evaluate(() => {
    return {initializationType: typeof window.Countly.init, apiKey: window.Countly.app_key};
  });

  expect(providerState).toEqual({initializationType: 'function', apiKey: undefined});
});

test('bundles browser API-client adapters without Node implementations', async ({}, testInfo) => {
  const buildVariant = testInfo.project.name === 'rspack-internal' ? 'internal' : 'public';
  const bundleDirectory = resolve(__dirname, '../../dist', buildVariant, 'min');
  const sourceMapSchema = z.object({sources: z.array(z.string())});
  const bundledSources = readdirSync(bundleDirectory)
    .filter(filename => {
      return filename.endsWith('.js.map');
    })
    .flatMap(filename => {
      const sourceMap = sourceMapSchema.parse(JSON.parse(readFileSync(resolve(bundleDirectory, filename), 'utf8')));

      return sourceMap.sources;
    });
  const browserAdapterSources = bundledSources.join('\n');

  for (const adapterName of ['buffer', 'cookie', 'websocket', 'platform']) {
    expect(browserAdapterSources).toContain('/apiClient/shims/browser/' + adapterName + '.ts');
  }

  const nodeImplementationSources = bundledSources.filter(sourcePath => {
    return /\/apiClient\/shims\/node\/(?:buffer|cookie|websocket|platform|obfuscateCookie)\.ts|\/node_modules\/(?:ws|tough-cookie)\//.test(
      sourcePath,
    );
  });

  expect(nodeImplementationSources).toEqual([]);
});

test('publishes legacy asset paths without camelCase duplicates', ({}, testInfo) => {
  const buildVariant = testInfo.project.name === 'rspack-internal' ? 'internal' : 'public';
  const buildDirectory = resolve(__dirname, '../../dist', buildVariant);
  const publishedAssetPaths = [
    'assets/images/backgrounds/office-1.png',
    'assets/images/backgrounds/office-2.png',
    'assets/images/backgrounds/wire-1.png',
    'assets/mediapipe-models/selfie_multiclass_256x256.tflite',
    'assets/mediapipe-models/selfie_segmenter_landscape.tflite',
  ];
  const camelCaseAssetPaths = [
    'assets/images/backgrounds/office1.png',
    'assets/images/backgrounds/office2.png',
    'assets/images/backgrounds/wire1.png',
    'assets/mediapipeModels/selfieMulticlass256x256.tflite',
    'assets/mediapipeModels/selfieSegmenterLandscape.tflite',
  ];

  for (const assetPath of publishedAssetPaths) {
    expect(existsSync(resolve(buildDirectory, assetPath)), `${buildVariant} build should publish ${assetPath}`).toBe(
      true,
    );
  }

  for (const assetPath of camelCaseAssetPaths) {
    expect(
      existsSync(resolve(buildDirectory, assetPath)),
      `${buildVariant} build should not publish ${assetPath}`,
    ).toBe(false);
  }
});
