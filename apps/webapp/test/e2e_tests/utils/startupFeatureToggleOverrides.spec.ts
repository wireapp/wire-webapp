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

import {expect, test} from '@playwright/test';

import {
  applockRefactoredFeatureToggleName,
  conversationListCollapseFeatureToggleName,
  testOnlyFeatureToggleName,
} from 'src/script/featureToggles/startupFeatureToggleNames';
import {startupFeatureToggleQueryParameterName} from 'src/script/featureToggles/startupFeatureToggles';

import {applyStartupFeatureToggleOverridesToUrl} from './startupFeatureToggleOverrides';

test.describe('applyStartupFeatureToggleOverridesToUrl', () => {
  test('enables a known feature without mutating the original URL', () => {
    const originalUrl = new URL('https://example.com/auth/#/login');

    const updatedUrl = applyStartupFeatureToggleOverridesToUrl(originalUrl, {
      [testOnlyFeatureToggleName]: true,
    });

    expect(updatedUrl.searchParams.get(startupFeatureToggleQueryParameterName)).toBe(testOnlyFeatureToggleName);
    expect(updatedUrl).not.toBe(originalUrl);
    expect(originalUrl.href).toBe('https://example.com/auth/#/login');
  });

  test('enables multiple features in canonical order regardless of override insertion order', () => {
    const originalUrl = new URL('https://example.com/');
    const updatedUrl = applyStartupFeatureToggleOverridesToUrl(originalUrl, {
      [testOnlyFeatureToggleName]: true,
      [applockRefactoredFeatureToggleName]: true,
    });
    const reorderedOverridesUrl = applyStartupFeatureToggleOverridesToUrl(originalUrl, {
      [applockRefactoredFeatureToggleName]: true,
      [testOnlyFeatureToggleName]: true,
    });

    expect(updatedUrl.search).toBe(
      `?${startupFeatureToggleQueryParameterName}=${applockRefactoredFeatureToggleName}%2C${testOnlyFeatureToggleName}`,
    );
    expect(updatedUrl.href).toBe(reorderedOverridesUrl.href);
  });

  test('disables only the specified feature', () => {
    const originalUrl = new URL(
      `https://example.com/?${startupFeatureToggleQueryParameterName}=${applockRefactoredFeatureToggleName},${testOnlyFeatureToggleName}`,
    );

    const updatedUrl = applyStartupFeatureToggleOverridesToUrl(originalUrl, {
      [testOnlyFeatureToggleName]: false,
    });

    expect(updatedUrl.searchParams.get(startupFeatureToggleQueryParameterName)).toBe(
      applockRefactoredFeatureToggleName,
    );
  });

  test('removes the query parameter when disabling the last enabled feature', () => {
    const originalUrl = new URL(
      `https://example.com/?${startupFeatureToggleQueryParameterName}=${testOnlyFeatureToggleName}`,
    );

    const updatedUrl = applyStartupFeatureToggleOverridesToUrl(originalUrl, {
      [testOnlyFeatureToggleName]: false,
    });

    expect(updatedUrl.searchParams.has(startupFeatureToggleQueryParameterName)).toBe(false);
    expect(updatedUrl.search).toBe('');
  });

  test('preserves unrelated query parameters including repeated values', () => {
    const originalUrl = new URL('https://example.com/auth/?return=conversation%2F123&filter=one&filter=two');

    const updatedUrl = applyStartupFeatureToggleOverridesToUrl(originalUrl, {
      [testOnlyFeatureToggleName]: true,
    });

    expect(updatedUrl.searchParams.get('return')).toBe('conversation/123');
    expect(updatedUrl.searchParams.getAll('filter')).toEqual(['one', 'two']);
    expect(updatedUrl.origin).toBe(originalUrl.origin);
    expect(updatedUrl.pathname).toBe(originalUrl.pathname);
  });

  test('preserves the URL hash when applying overrides', () => {
    const originalUrl = new URL('https://example.com/auth/#/login');

    const updatedUrl = applyStartupFeatureToggleOverridesToUrl(originalUrl, {
      [testOnlyFeatureToggleName]: true,
    });

    expect(updatedUrl.hash).toBe('#/login');
  });

  test('leaves the URL unchanged when overrides are omitted', () => {
    const originalUrl = new URL(
      `https://example.com/auth/?${startupFeatureToggleQueryParameterName}=${testOnlyFeatureToggleName},${applockRefactoredFeatureToggleName}&return=a%20b#/login`,
    );

    const updatedUrl = applyStartupFeatureToggleOverridesToUrl(originalUrl, {});

    expect(updatedUrl.href).toBe(originalUrl.href);
  });

  test('leaves feature state unchanged when an override is undefined', () => {
    const originalUrl = new URL(
      `https://example.com/?${startupFeatureToggleQueryParameterName}=${testOnlyFeatureToggleName}`,
    );

    const updatedUrl = applyStartupFeatureToggleOverridesToUrl(originalUrl, {
      [testOnlyFeatureToggleName]: undefined,
      [applockRefactoredFeatureToggleName]: undefined,
    });

    expect(updatedUrl.href).toBe(originalUrl.href);
  });

  test('composes enabling, disabling, and undefined overrides while keeping unspecified features', () => {
    const originalUrl = new URL(
      `https://example.com/?${startupFeatureToggleQueryParameterName}=${applockRefactoredFeatureToggleName},${conversationListCollapseFeatureToggleName}&return=home#/login`,
    );

    const updatedUrl = applyStartupFeatureToggleOverridesToUrl(originalUrl, {
      [testOnlyFeatureToggleName]: true,
      [applockRefactoredFeatureToggleName]: false,
      [conversationListCollapseFeatureToggleName]: undefined,
    });

    expect(updatedUrl.searchParams.get(startupFeatureToggleQueryParameterName)).toBe(
      `${conversationListCollapseFeatureToggleName},${testOnlyFeatureToggleName}`,
    );
    expect(updatedUrl.searchParams.get('return')).toBe('home');
    expect(updatedUrl.hash).toBe('#/login');
  });
});
