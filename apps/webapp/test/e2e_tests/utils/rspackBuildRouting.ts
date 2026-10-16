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

import {isNonEmptyString, isNull, isPlainObject, isUndefined} from '@sindresorhus/is';
import {generateClientConfig} from '@wireapp/config';
import type {BuildMetadata, ClientConfig, ConfigGeneratorParams, Env} from '@wireapp/config';
import type {BrowserContext, Route} from '@playwright/test';
import {Result} from 'true-myth';
import {resolveRspackSmokeAssetPath} from '../../rspack-smoke/rspackSmokeAssetPathResolver.ts';

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
  readonly generatedRuntimeConfiguration: ClientConfig;
};

export type RspackBuildRouteState = {
  generatedRuntimeConfigurationServed: boolean;
  readonly servedAssetPaths: Set<string>;
  readonly missingAssetPaths: string[];
  readonly runtimeConfigurationIssues: string[];
};

export type GenerateRspackRuntimeConfigurationOptions = {
  readonly buildMetadata: BuildMetadata;
  readonly environment: Env;
  readonly urls: ConfigGeneratorParams['urls'];
};

export function generateRspackRuntimeConfiguration(options: GenerateRspackRuntimeConfigurationOptions): ClientConfig {
  const {buildMetadata, environment, urls} = options;

  return generateClientConfig(
    {
      assetVersion: buildMetadata.assetVersion,
      commit: buildMetadata.commit,
      version: buildMetadata.version,
      env: 'production',
      urls,
    },
    environment,
  );
}

export type RspackRuntimeConfigurationError =
  | {readonly kind: 'missingConfigurationAssignment'}
  | {readonly kind: 'invalidConfigurationJson'}
  | {readonly kind: 'invalidConfigurationShape'}
  | {readonly kind: 'missingRequiredEndpoint'; readonly endpointName: 'APP_BASE' | 'BACKEND_REST' | 'BACKEND_WS'};

export type CreateRspackRuntimeConfigurationOptions = {
  readonly deployedRuntimeConfigurationScript: string;
  readonly generatedRuntimeConfiguration: ClientConfig;
};

const deployedRuntimeConfigurationAssignmentPattern = /window\.wire\.env\s*=\s*/;
const requiredRuntimeConfigurationEndpointNames = ['APP_BASE', 'BACKEND_REST', 'BACKEND_WS'] as const;

function parseDeployedRuntimeConfiguration(
  deployedRuntimeConfigurationScript: string,
): Result<Record<string, unknown>, RspackRuntimeConfigurationError> {
  const assignmentStartIndex = deployedRuntimeConfigurationScript.search(deployedRuntimeConfigurationAssignmentPattern);
  if (assignmentStartIndex < 0) {
    return Result.err({kind: 'missingConfigurationAssignment'});
  }

  const assignmentPrefix = deployedRuntimeConfigurationScript.match(deployedRuntimeConfigurationAssignmentPattern);
  if (isNull(assignmentPrefix)) {
    return Result.err({kind: 'missingConfigurationAssignment'});
  }

  const assignmentPrefixText = assignmentPrefix.at(0);
  if (!isNonEmptyString(assignmentPrefixText)) {
    return Result.err({kind: 'missingConfigurationAssignment'});
  }

  const serializedConfigurationWithTerminator = deployedRuntimeConfigurationScript
    .slice(assignmentStartIndex + assignmentPrefixText.length)
    .trim();
  const serializedConfiguration = serializedConfigurationWithTerminator.replace(/;\s*$/, '').trim();

  let deployedRuntimeConfiguration: unknown;
  try {
    deployedRuntimeConfiguration = JSON.parse(serializedConfiguration);
  } catch {
    return Result.err({kind: 'invalidConfigurationJson'});
  }

  if (!isPlainObject(deployedRuntimeConfiguration)) {
    return Result.err({kind: 'invalidConfigurationShape'});
  }

  for (const endpointName of requiredRuntimeConfigurationEndpointNames) {
    if (!isNonEmptyString(deployedRuntimeConfiguration[endpointName])) {
      return Result.err({kind: 'missingRequiredEndpoint', endpointName});
    }
  }

  return Result.ok(deployedRuntimeConfiguration);
}

export function createRspackRuntimeConfiguration(
  options: CreateRspackRuntimeConfigurationOptions,
): Result<Readonly<Record<string, unknown>>, RspackRuntimeConfigurationError> {
  const {deployedRuntimeConfigurationScript, generatedRuntimeConfiguration} = options;

  return parseDeployedRuntimeConfiguration(deployedRuntimeConfigurationScript).map(deployedRuntimeConfiguration => {
    const deployedFeatureConfiguration = isPlainObject(deployedRuntimeConfiguration.FEATURE)
      ? deployedRuntimeConfiguration.FEATURE
      : {};
    const deployedUrlConfiguration = isPlainObject(deployedRuntimeConfiguration.URL)
      ? deployedRuntimeConfiguration.URL
      : {};
    const deployedUrlPathConfiguration = isPlainObject(deployedUrlConfiguration.URL_PATH)
      ? deployedUrlConfiguration.URL_PATH
      : {};

    return {
      ...generatedRuntimeConfiguration,
      ...deployedRuntimeConfiguration,
      FEATURE: {
        ...generatedRuntimeConfiguration.FEATURE,
        ...deployedFeatureConfiguration,
      },
      URL: {
        ...generatedRuntimeConfiguration.URL,
        ...deployedUrlConfiguration,
        URL_PATH: {
          ...generatedRuntimeConfiguration.URL.URL_PATH,
          ...deployedUrlPathConfiguration,
        },
      },
    };
  });
}

export function isRspackRuntimeConfigurationUrl(requestUrl: URL, applicationOrigin: string): boolean {
  return requestUrl.origin === applicationOrigin && requestUrl.pathname === '/config.js';
}

export function isRspackStaticAssetPath(requestPathname: string): boolean {
  const pathSegments = requestPathname.split('/');
  const firstPathSegment = pathSegments.at(1);

  return isNonEmptyString(firstPathSegment) && rspackAssetRouteNames.includes(firstPathSegment);
}

export async function installRspackBuildRoutes(
  browserContext: BrowserContext,
  options: RspackBuildRouteOptions,
): Promise<RspackBuildRouteState> {
  const routeState: RspackBuildRouteState = {
    generatedRuntimeConfigurationServed: false,
    missingAssetPaths: [],
    servedAssetPaths: new Set(),
    runtimeConfigurationIssues: [],
  };

  await browserContext.route('**/*', async route => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.origin !== options.applicationOrigin) {
      await route.continue();

      return;
    }

    if (isRspackRuntimeConfigurationUrl(requestUrl, options.applicationOrigin)) {
      await fulfillRspackRuntimeConfiguration({route, options, routeState});

      return;
    }

    if (!isRspackStaticAssetPath(requestUrl.pathname)) {
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

        await route.fulfill({
          headers: rspackAssetResponseHeaders,
          path: assetPath,
        });
        routeState.servedAssetPaths.add(requestUrl.pathname);
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

type FulfillRspackRuntimeConfigurationOptions = {
  readonly route: Route;
  readonly options: RspackBuildRouteOptions;
  readonly routeState: RspackBuildRouteState;
};

async function fulfillRspackRuntimeConfiguration(options: FulfillRspackRuntimeConfigurationOptions): Promise<void> {
  const {route, options: routeOptions, routeState} = options;
  const deployedConfigurationResponse = await route.fetch();

  if (!deployedConfigurationResponse.ok()) {
    routeState.runtimeConfigurationIssues.push(
      `QA runtime configuration returned HTTP ${deployedConfigurationResponse.status()}.`,
    );
    await route.fulfill({response: deployedConfigurationResponse});

    return;
  }

  const deployedRuntimeConfigurationScript = await deployedConfigurationResponse.text();
  const mergedRuntimeConfiguration = createRspackRuntimeConfiguration({
    deployedRuntimeConfigurationScript,
    generatedRuntimeConfiguration: routeOptions.generatedRuntimeConfiguration,
  });

  await mergedRuntimeConfiguration.match({
    Ok: async runtimeConfiguration => {
      const serializedRuntimeConfiguration = JSON.stringify(runtimeConfiguration);
      if (isUndefined(serializedRuntimeConfiguration)) {
        routeState.runtimeConfigurationIssues.push('Generated runtime configuration could not be serialized.');
        await route.fulfill({
          body: 'Rspack runtime configuration could not be generated.',
          contentType: 'text/plain; charset=utf-8',
          status: 502,
        });

        return;
      }

      await route.fulfill({
        response: deployedConfigurationResponse,
        body: `window.wire = window.wire || {}; window.wire.env = ${serializedRuntimeConfiguration};`,
      });
      routeState.generatedRuntimeConfigurationServed = true;
    },
    Err: async error => {
      routeState.runtimeConfigurationIssues.push(`QA runtime configuration is incompatible (${error.kind}).`);
      await route.fulfill({
        body: 'Rspack runtime configuration could not be generated.',
        contentType: 'text/plain; charset=utf-8',
        status: 502,
      });
    },
  });
}

export type RspackRuntimeDiagnostics = {
  readonly uncaughtJavascriptExceptions: string[];
  readonly failedRspackAssetRequests: string[];
  readonly failedRspackAssetResponses: string[];
  readonly bundlerRuntimeConsoleErrors: string[];
  readonly successfulRspackScriptPaths: Set<string>;
  readonly successfulRspackWasmPaths: Set<string>;
};

export type RspackRuntimeVerificationContext = {
  readonly routeState: RspackBuildRouteState;
  readonly diagnostics: RspackRuntimeDiagnostics;
};

export type GetRspackRuntimeCompatibilityIssuesOptions = {
  readonly rspackContexts: readonly RspackRuntimeVerificationContext[];
  readonly requiredEntryScriptPaths: readonly string[];
};

export function getRspackRuntimeCompatibilityIssues(options: GetRspackRuntimeCompatibilityIssuesOptions): string[] {
  const {rspackContexts, requiredEntryScriptPaths} = options;
  if (rspackContexts.length === 0) {
    return ['No browser context was configured for Rspack runtime verification.'];
  }

  return rspackContexts.flatMap((rspackContext, contextIndex) => {
    const {diagnostics, routeState} = rspackContext;
    const contextCompatibilityIssues = [
      ...(routeState.generatedRuntimeConfigurationServed
        ? []
        : ['Generated Rspack runtime configuration was not served from the QA application origin.']),
      ...routeState.runtimeConfigurationIssues,
      ...routeState.missingAssetPaths.map(assetPath => {
        return `Local Rspack asset is missing: ${assetPath}`;
      }),
      ...diagnostics.uncaughtJavascriptExceptions,
      ...diagnostics.failedRspackAssetRequests,
      ...diagnostics.failedRspackAssetResponses,
      ...diagnostics.bundlerRuntimeConsoleErrors,
    ];

    for (const entryScriptPath of requiredEntryScriptPaths) {
      if (!routeState.servedAssetPaths.has(entryScriptPath)) {
        contextCompatibilityIssues.push(
          `Required entry script was not served from the local Rspack build: ${entryScriptPath}`,
        );
      }

      if (!diagnostics.successfulRspackScriptPaths.has(entryScriptPath)) {
        contextCompatibilityIssues.push(
          `Required entry script did not receive a successful browser response: ${entryScriptPath}`,
        );
      }
    }

    return contextCompatibilityIssues.map(issue => {
      return `Browser context ${contextIndex + 1}: ${issue}`;
    });
  });
}

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
