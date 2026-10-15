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

import {Maybe, Result} from 'true-myth';

import * as nodePath from 'node:path';

import {readHtmlResourceAttributeValues} from './buildArtifactMetadata.ts';

export type WebappBuildArtifactHtmlDocument = {
  readonly relativePath: string;
  readonly contents: string;
};

export type WebappBuildArtifactContractOptions = {
  readonly artifactFilePaths: readonly string[];
  readonly copiedStaticAssetPaths: readonly string[];
  readonly htmlDocuments: readonly WebappBuildArtifactHtmlDocument[];
};

export type WebappBuildArtifactContractReport = {
  readonly checkedArtifactFileCount: number;
  readonly checkedCopiedStaticAssetCount: number;
  readonly checkedHtmlDocumentPaths: readonly string[];
};

const requiredHtmlDocumentPaths = ['index.html', 'auth/index.html', 'unsupported/index.html'];

const requiredBundledAssetPaths = [
  'min/app.js',
  'min/app.js.map',
  'min/auth.js',
  'min/auth.js.map',
  'min/basicBrowserFeatureCheck.js',
  'min/checkBrowser.js',
  'min/checkBrowser.js.map',
  'min/core-crypto-ffi_bg.wasm',
  'min/dexie.js',
  'min/dexie.js.map',
  'min/loader.js',
  'min/mediapipe/wasm/vision_wasm_internal.js',
  'min/mediapipe/wasm/vision_wasm_internal.wasm',
  'min/pdf.worker.mjs',
  'min/runtime.js',
  'min/runtime.js.map',
  'min/vendor.js',
  'min/vendor.js.map',
  'sw.js',
];

const serverProvidedResourcePaths = new Set(['config.js', 'libs/wire/telemetry/embed.js']);

const requiredScriptSourcePathsByHtmlDocument: Readonly<Record<string, readonly string[]>> = {
  'index.html': [
    'min/basicBrowserFeatureCheck.js',
    'min/checkBrowser.js',
    'libs/wire/telemetry/embed.js',
    'min/loader.js',
    'config.js',
    'min/dexie.js',
    'min/vendor.js',
    'min/runtime.js',
    'min/app.js',
  ],
  'auth/index.html': [
    'min/basicBrowserFeatureCheck.js',
    'min/checkBrowser.js',
    'libs/wire/telemetry/embed.js',
    'config.js',
    'min/dexie.js',
    'min/vendor.js',
    'min/runtime.js',
    'min/auth.js',
  ],
};

const htmlScriptSourcePattern = /<script\b[^>]*\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+))[^>]*>/giu;
const firstResourceAttributeCaptureIndex = 1;
const secondResourceAttributeCaptureIndex = firstResourceAttributeCaptureIndex + 1;
const thirdResourceAttributeCaptureIndex = secondResourceAttributeCaptureIndex + 1;

function resolveArtifactRelativePath(htmlDocumentPath: string, resourceUrl: string): Maybe<string> {
  const resourcePath = resourceUrl.replace(/[?#].*$/u, '');

  if (resourcePath.length === 0 || resourcePath.startsWith('//') || /^[a-z][a-z\d+.-]*:/iu.test(resourcePath)) {
    return Maybe.nothing();
  }

  const artifactRelativePath = resourcePath.startsWith('/')
    ? resourcePath.replace(/^\/+/, '')
    : nodePath.posix.join(nodePath.posix.dirname(htmlDocumentPath), resourcePath);

  return Maybe.just(nodePath.posix.normalize(artifactRelativePath));
}

function readScriptSourcePaths(htmlDocument: WebappBuildArtifactHtmlDocument): readonly string[] {
  const scriptSourcePaths: string[] = [];

  for (const scriptTagMatch of htmlDocument.contents.matchAll(htmlScriptSourcePattern)) {
    const scriptSourceUrl =
      scriptTagMatch[firstResourceAttributeCaptureIndex] ??
      scriptTagMatch[secondResourceAttributeCaptureIndex] ??
      scriptTagMatch[thirdResourceAttributeCaptureIndex];

    if (scriptSourceUrl === undefined) {
      continue;
    }

    const artifactRelativePath = resolveArtifactRelativePath(htmlDocument.relativePath, scriptSourceUrl);

    if (artifactRelativePath.isJust) {
      scriptSourcePaths.push(artifactRelativePath.value);
    }
  }

  return scriptSourcePaths;
}

function getContractErrors(options: WebappBuildArtifactContractOptions): readonly string[] {
  const artifactFilePathSet = new Set(options.artifactFilePaths);
  const htmlDocumentByPath = new Map<string, WebappBuildArtifactHtmlDocument>();
  const contractErrors: string[] = [];

  for (const htmlDocument of options.htmlDocuments) {
    htmlDocumentByPath.set(htmlDocument.relativePath, htmlDocument);
  }

  for (const requiredHtmlDocumentPath of requiredHtmlDocumentPaths) {
    if (!htmlDocumentByPath.has(requiredHtmlDocumentPath)) {
      contractErrors.push(`Missing generated HTML document '${requiredHtmlDocumentPath}'`);
    }
  }

  for (const requiredBundledAssetPath of requiredBundledAssetPaths) {
    if (artifactFilePathSet.has(requiredBundledAssetPath) === false) {
      contractErrors.push(`Missing bundled application asset '${requiredBundledAssetPath}'`);
    }
  }

  for (const copiedStaticAssetPath of options.copiedStaticAssetPaths) {
    if (artifactFilePathSet.has(copiedStaticAssetPath) === false) {
      contractErrors.push(`Missing copied static asset '${copiedStaticAssetPath}'`);
    }
  }

  for (const htmlDocument of options.htmlDocuments) {
    const expectedScriptSourcePaths = requiredScriptSourcePathsByHtmlDocument[htmlDocument.relativePath];

    if (expectedScriptSourcePaths !== undefined) {
      const actualScriptSourcePaths = readScriptSourcePaths(htmlDocument);
      let matchedScriptCount = 0;

      for (const actualScriptSourcePath of actualScriptSourcePaths) {
        const expectedScriptSourcePath = expectedScriptSourcePaths[matchedScriptCount];

        if (expectedScriptSourcePath === undefined) {
          break;
        }

        if (actualScriptSourcePath === expectedScriptSourcePath) {
          matchedScriptCount += 1;
        }
      }

      if (matchedScriptCount !== expectedScriptSourcePaths.length) {
        contractErrors.push(
          `Generated HTML '${htmlDocument.relativePath}' is missing or reorders required scripts: ${expectedScriptSourcePaths.join(', ')}`,
        );
      }
    }

    for (const resourceUrl of readHtmlResourceAttributeValues(htmlDocument.contents)) {
      const artifactRelativePath = resolveArtifactRelativePath(htmlDocument.relativePath, resourceUrl);

      if (artifactRelativePath.isNothing || serverProvidedResourcePaths.has(artifactRelativePath.value)) {
        continue;
      }

      if (artifactFilePathSet.has(artifactRelativePath.value) === false) {
        contractErrors.push(
          `Generated HTML '${htmlDocument.relativePath}' references missing bundled resource '${artifactRelativePath.value}'`,
        );
      }
    }
  }

  return contractErrors;
}

export function validateWebappBuildArtifactContract(
  options: WebappBuildArtifactContractOptions,
): Result<WebappBuildArtifactContractReport, Error> {
  const contractErrors = getContractErrors(options);

  if (contractErrors.length > 0) {
    return Result.err(new Error(contractErrors.join('\n')));
  }

  return Result.ok({
    checkedArtifactFileCount: options.artifactFilePaths.length,
    checkedCopiedStaticAssetCount: options.copiedStaticAssetPaths.length,
    checkedHtmlDocumentPaths: requiredHtmlDocumentPaths,
  });
}
