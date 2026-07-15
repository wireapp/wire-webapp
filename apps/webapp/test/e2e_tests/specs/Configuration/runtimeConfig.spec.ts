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

import {expect} from '@playwright/test';
import {type ConfigGeneratorParams, type Env, generateClientConfig} from '@wireapp/config';

import {test} from '../../test.fixtures';

type LeafStatus = 'required' | 'optional';
type ConfigTree = LeafStatus | {[key: string]: ConfigTree};

type ConfigDiff = {
  readonly missingPaths: string[];
  readonly extraPaths: string[];
};

const referenceConfigParams: ConfigGeneratorParams = {
  commit: 'reference-commit',
  version: 'reference-version',
  env: 'production',
  urls: {},
};

// ternary default resolve to a defined value (required),
// fields that are a plain env variable and pass-through with no fallback resolve to undefined (optional)
const referenceEnv = {} as Env;
const referenceConfigTree = buildConfigTree(generateClientConfig(referenceConfigParams, referenceEnv));

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function buildConfigTree(value: unknown): ConfigTree {
  if (!isPlainObject(value)) {
    return value === undefined ? 'optional' : 'required';
  }

  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, buildConfigTree(child)]));
}

function collectTreePaths(tree: ConfigTree, prefix: string[] = []): string[] {
  if (tree === 'required' || tree === 'optional') {
    return [prefix.join('.')];
  }

  return Object.entries(tree).flatMap(([key, child]) => {
    return collectTreePaths(child, [...prefix, key]);
  });
}

function collectRequiredPaths(tree: ConfigTree, prefix: string[] = []): string[] {
  if (tree === 'optional') {
    return [];
  }

  if (tree === 'required') {
    return [prefix.join('.')];
  }

  return Object.entries(tree).flatMap(([key, child]) => {
    return collectRequiredPaths(child, [...prefix, key]);
  });
}

function diffConfigTrees(expectedTree: ConfigTree, actualTree: ConfigTree, prefix: string[] = []): ConfigDiff {
  const expectedIsLeaf = expectedTree === 'required' || expectedTree === 'optional';
  const actualIsLeaf = actualTree === 'required' || actualTree === 'optional';

  if (expectedIsLeaf && actualIsLeaf) {
    return {missingPaths: [], extraPaths: []};
  }

  if (expectedIsLeaf) {
    return {missingPaths: [], extraPaths: collectTreePaths(actualTree, prefix)};
  }

  if (actualIsLeaf) {
    return {missingPaths: collectRequiredPaths(expectedTree, prefix), extraPaths: []};
  }

  const expectedKeys = new Set(Object.keys(expectedTree));
  const actualKeys = new Set(Object.keys(actualTree));
  const missingPaths: string[] = [];
  const extraPaths: string[] = [];

  for (const [key, expectedChild] of Object.entries(expectedTree)) {
    const childPrefix = [...prefix, key];

    if (!actualKeys.has(key)) {
      missingPaths.push(...collectRequiredPaths(expectedChild, childPrefix));
      continue;
    }

    const actualChild = actualTree[key];
    const childDiff = diffConfigTrees(expectedChild, actualChild, childPrefix);
    missingPaths.push(...childDiff.missingPaths);
    extraPaths.push(...childDiff.extraPaths);
  }

  for (const [key, actualChild] of Object.entries(actualTree)) {
    if (expectedKeys.has(key)) {
      continue;
    }

    extraPaths.push(...collectTreePaths(actualChild, [...prefix, key]));
  }

  return {missingPaths, extraPaths};
}

function formatPathList(label: string, paths: string[]): string {
  return `${label}: ${paths.length === 0 ? 'N/A' : paths.join(', ')}`;
}

test.describe('runtime configuration', () => {
  test('config.js exposes exactly the required properties', async ({page}) => {
    const webappUrl = process.env.WEBAPP_URL;
    if (webappUrl === undefined) {
      throw new Error('Missing environment variable WEBAPP_URL');
    }

    await page.goto(webappUrl, {waitUntil: 'networkidle'});
    await page.waitForFunction(() => window.wire?.env !== undefined);

    const runtimeConfig = await page.evaluate(() => {
      return window.wire.env;
    });

    const runtimeConfigTree = buildConfigTree(runtimeConfig);
    const {missingPaths, extraPaths} = diffConfigTrees(referenceConfigTree, runtimeConfigTree);

    const expectationMessage = [
      formatPathList('Missing configuration properties', missingPaths),
      formatPathList('Extra configuration properties', extraPaths),
    ].join('\n\n');

    expect({missingPaths, extraPaths}, expectationMessage).toEqual({missingPaths: [], extraPaths: []});
  });
});
