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

import {existsSync, statSync} from 'node:fs';

import {isNonEmptyString} from '@sindresorhus/is';
import type {BrowserContext} from '@playwright/test';
import {resolveRspackSmokeAssetPath} from '../../rspack-smoke/rspackSmokeAssetPathResolver';

const rspackAssetRouteNames: readonly string[] = [
  'audio',
  'assets',
  'ext',
  'font',
  'image',
  'min',
  'proto',
  'style',
  'worker',
];

const rspackAssetResponseHeaders: Readonly<Record<string, string>> = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'same-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
};

export type RspackBuildRouteOptions = {
  readonly applicationOrigin: string;
  readonly buildDirectoryPath: string;
};

export type RspackBuildRouteState = {
  readonly servedAssetPaths: Set<string>;
  readonly missingAssetPaths: string[];
};

export function isRspackStaticAssetPath(requestPathname: string): boolean {
  const pathSegments = requestPathname.split('/');
  const firstPathSegment = pathSegments.at(1);

  return isNonEmptyString(firstPathSegment) && rspackAssetRouteNames.includes(firstPathSegment);
}

export function installRspackBuildRoutes(
  browserContext: BrowserContext,
  options: RspackBuildRouteOptions,
): RspackBuildRouteState {
  const routeState: RspackBuildRouteState = {
    missingAssetPaths: [],
    servedAssetPaths: new Set(),
  };

  browserContext.route('**/*', async route => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.origin !== options.applicationOrigin || !isRspackStaticAssetPath(requestUrl.pathname)) {
      await route.continue();

      return;
    }

    const resolvedAssetPath = resolveRspackSmokeAssetPath(requestUrl.pathname, options.buildDirectoryPath);
    await resolvedAssetPath.match({
      Ok: async assetPath => {
        if (!existsSync(assetPath) || !statSync(assetPath).isFile()) {
          routeState.missingAssetPaths.push(requestUrl.pathname);
          await route.fulfill({
            body: `Rspack asset not found: ${requestUrl.pathname}`,
            contentType: 'text/plain; charset=utf-8',
            headers: rspackAssetResponseHeaders,
            status: 404,
          });

          return;
        }

        routeState.servedAssetPaths.add(requestUrl.pathname);
        await route.fulfill({
          headers: rspackAssetResponseHeaders,
          path: assetPath,
        });
      },
      Err: async () => {
        routeState.missingAssetPaths.push(requestUrl.pathname);
        await route.fulfill({
          body: `Invalid Rspack asset path: ${requestUrl.pathname}`,
          contentType: 'text/plain; charset=utf-8',
          headers: rspackAssetResponseHeaders,
          status: 400,
        });
      },
    });
  });

  return routeState;
}

export type RspackRuntimeDiagnostics = {
  readonly uncaughtJavascriptExceptions: string[];
  readonly failedRspackAssetRequests: string[];
  readonly failedRspackAssetResponses: string[];
  readonly bundlerRuntimeConsoleErrors: string[];
  readonly successfulRspackScriptPaths: Set<string>;
  readonly successfulRspackWasmPaths: Set<string>;
};

export type CaptureRspackRuntimeDiagnosticsOptions = {
  readonly page: import('@playwright/test').Page;
  readonly applicationOrigin: string;
  readonly diagnostics: RspackRuntimeDiagnostics;
};

const bundlerRuntimeConsoleErrorPattern =
  /(?:WebAssembly|\.wasm\b|\bworker\b|dynamically imported module|ChunkLoadError|Loading chunk|Core Crypto.{0,40}(?:failed|error|initializ))/i;

export function createRspackRuntimeDiagnostics(): RspackRuntimeDiagnostics {
  return {
    bundlerRuntimeConsoleErrors: [],
    failedRspackAssetRequests: [],
    failedRspackAssetResponses: [],
    successfulRspackScriptPaths: new Set(),
    successfulRspackWasmPaths: new Set(),
    uncaughtJavascriptExceptions: [],
  };
}

export function captureRspackRuntimeDiagnostics(options: CaptureRspackRuntimeDiagnosticsOptions): void {
  const {page, applicationOrigin, diagnostics} = options;

  page.on('pageerror', error => {
    diagnostics.uncaughtJavascriptExceptions.push(error.stack ?? error.message);
  });

  page.on('requestfailed', request => {
    const requestUrl = new URL(request.url());
    if (requestUrl.origin !== applicationOrigin || !isRspackStaticAssetPath(requestUrl.pathname)) {
      return;
    }

    const requestFailure = request.failure();
    const failureMessage = requestFailure === null ? 'request failed' : requestFailure.errorText;
    diagnostics.failedRspackAssetRequests.push(`${request.resourceType()} ${requestUrl.pathname}: ${failureMessage}`);
  });

  page.on('response', response => {
    const responseUrl = new URL(response.url());
    if (responseUrl.origin !== applicationOrigin || !isRspackStaticAssetPath(responseUrl.pathname)) {
      return;
    }

    if (response.status() >= 400) {
      diagnostics.failedRspackAssetResponses.push(
        `${response.status()} ${response.request().resourceType()} ${responseUrl.pathname}`,
      );
    }

    if (!response.ok()) {
      return;
    }

    if (response.request().resourceType() === 'script') {
      diagnostics.successfulRspackScriptPaths.add(responseUrl.pathname);
    }

    if (responseUrl.pathname.endsWith('.wasm')) {
      diagnostics.successfulRspackWasmPaths.add(responseUrl.pathname);
    }
  });

  page.on('console', message => {
    if (message.type() !== 'error' || !bundlerRuntimeConsoleErrorPattern.test(message.text())) {
      return;
    }

    diagnostics.bundlerRuntimeConsoleErrors.push(message.text());
  });
}
