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
import {noop} from 'noop-esm';
import {match} from 'ts-pattern';
import {Maybe} from 'true-myth';

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
          .with(true, noop)
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

  for (const scriptPath of requiredScriptPaths) {
    await expect
      .poll(() => {
        return Maybe.of(diagnostics.localScriptResponses.get(scriptPath));
      }, {
        message: `${buildProjectName} should load ${scriptPath}`,
      })
      .toEqual(Maybe.just(200));
  }
}

test('loads the application entry points and redirects an unauthenticated visitor to authentication', async ({page}, testInfo) => {
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
  await expect(page).toHaveURL(/\/auth\/?(?:#\/)?$/);
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
    ],
  });
  expectNoRuntimeFailures({diagnostics, buildProjectName: testInfo.project.name});
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
