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

import type {WebappBuildArtifactContractOptions} from './webappBuildArtifactContract';
import {validateWebappBuildArtifactContract} from './webappBuildArtifactContract';

function createValidContractOptions(): WebappBuildArtifactContractOptions {
  const htmlDocuments = [
    {
      relativePath: 'index.html',
      contents: [
        '<link href="./image/favicon.ico?v=fixture-version">',
        '<script src="./min/basicBrowserFeatureCheck.js?v=fixture-version"></script>',
        '<script src="./min/checkBrowser.js?v=fixture-version"></script>',
        '<script src="./libs/wire/telemetry/embed.js"></script>',
        '<link href="./min/core-crypto-ffi_bg.wasm" rel="prefetch">',
        '<script src="./min/loader.js?v=fixture-version"></script>',
        '<script src="./config.js"></script>',
        '<script src="./min/dexie.js?v=fixture-version"></script>',
        '<script src="./min/vendor.js?v=fixture-version"></script>',
        '<script src="./min/runtime.js?v=fixture-version"></script>',
        '<script src="./min/app.js?v=fixture-version"></script>',
      ].join(''),
    },
    {
      relativePath: 'auth/index.html',
      contents: [
        '<script src="../min/basicBrowserFeatureCheck.js?v=fixture-version"></script>',
        '<script src="../min/checkBrowser.js?v=fixture-version"></script>',
        '<script src="../libs/wire/telemetry/embed.js"></script>',
        '<link href="../min/core-crypto-ffi_bg.wasm" rel="prefetch">',
        '<script src="../config.js"></script>',
        '<script src="../min/dexie.js?v=fixture-version"></script>',
        '<script src="../min/vendor.js?v=fixture-version"></script>',
        '<script src="../min/runtime.js?v=fixture-version"></script>',
        '<script src="../min/auth.js?v=fixture-version"></script>',
      ].join(''),
    },
    {
      relativePath: 'unsupported/index.html',
      contents: '<link href="/image/favicon.ico?v=fixture-version"><main>Unsupported browser</main>',
    },
  ];

  return {
    artifactFilePaths: [
      'index.html',
      'auth/index.html',
      'unsupported/index.html',
      'image/favicon.ico',
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
    ],
    copiedStaticAssetPaths: ['image/favicon.ico'],
    htmlDocuments,
  };
}

describe('validateWebappBuildArtifactContract', (): void => {
  it('validates production pages, ordered entry scripts, runtime files, and copied static assets', (): void => {
    const validationResult = validateWebappBuildArtifactContract(createValidContractOptions());

    expect(validationResult.isOk).toBe(true);

    if (validationResult.isErr) {
      throw validationResult.error;
    }

    expect(validationResult.value.checkedHtmlDocumentPaths).toEqual([
      'index.html',
      'auth/index.html',
      'unsupported/index.html',
    ]);
    expect(validationResult.value.checkedCopiedStaticAssetCount).toBe(1);
  });

  it('treats config and telemetry embed scripts as resources supplied by Express', (): void => {
    const contractOptions = createValidContractOptions();
    const artifactFilePathsWithoutServerResources = contractOptions.artifactFilePaths.filter(artifactFilePath => {
      return artifactFilePath !== 'config.js' && artifactFilePath !== 'libs/wire/telemetry/embed.js';
    });
    const actualValidationResult = validateWebappBuildArtifactContract({
      ...contractOptions,
      artifactFilePaths: artifactFilePathsWithoutServerResources,
    });

    expect(actualValidationResult.isOk).toBe(true);
  });

  it('reports missing files and entry script ordering errors', (): void => {
    const contractOptions = createValidContractOptions();
    const actualValidationResult = validateWebappBuildArtifactContract({
      ...contractOptions,
      artifactFilePaths: contractOptions.artifactFilePaths.filter(artifactFilePath => {
        return artifactFilePath !== 'min/pdf.worker.mjs';
      }),
      htmlDocuments: contractOptions.htmlDocuments.map(htmlDocument => {
        if (htmlDocument.relativePath !== 'index.html') {
          return htmlDocument;
        }

        return {
          ...htmlDocument,
          contents: htmlDocument.contents.replace(
            '<script src="./min/vendor.js?v=fixture-version"></script><script src="./min/runtime.js?v=fixture-version"></script>',
            '<script src="./min/runtime.js?v=fixture-version"></script><script src="./min/vendor.js?v=fixture-version"></script>',
          ),
        };
      }),
    });

    expect(actualValidationResult.isErr).toBe(true);

    if (actualValidationResult.isErr) {
      expect(actualValidationResult.error.message).toContain("Missing bundled application asset 'min/pdf.worker.mjs'");
      expect(actualValidationResult.error.message).toContain('missing or reorders required scripts');
    }
  });
});
