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

import {
  applockRefactoredFeatureToggleName,
  conversationListCollapseFeatureToggleName,
} from './startupFeatureToggleNames';
import {startupFeatureToggleQueryParameterName, startupFeatureToggleLocalStorageKey} from './startupFeatureToggles';
import {updateLocationSearchForStartupFeatureToggle} from './startupFeatureToggleQueryParameters';

type LocalStorageStub = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function createInMemoryLocalStorageStub(initialValue?: string): {
  localStorage: LocalStorageStub;
  getStoredValue: () => string | null;
} {
  let storedValue: string | null = initialValue ?? null;

  return {
    localStorage: {
      getItem: (key: string) => (key === startupFeatureToggleLocalStorageKey ? storedValue : null),
      setItem: (key: string, value: string) => {
        if (key === startupFeatureToggleLocalStorageKey) {
          storedValue = value;
        }
      },
      removeItem: (key: string) => {
        if (key === startupFeatureToggleLocalStorageKey) {
          storedValue = null;
        }
      },
    },
    getStoredValue: () => storedValue,
  };
}

describe('updateLocationSearchForStartupFeatureToggle', () => {
  it('adds a feature toggle to an existing query string and preserves unrelated parameters', () => {
    const updatedLocationSearch = updateLocationSearchForStartupFeatureToggle({
      locationSearch: '?foo=bar',
      featureToggleName: applockRefactoredFeatureToggleName,
      shouldEnableFeatureToggle: true,
    });

    expect(updatedLocationSearch).toBe(
      `?foo=bar&${startupFeatureToggleQueryParameterName}=${applockRefactoredFeatureToggleName}`,
    );
  });

  it('removes a feature toggle and preserves other enabled toggles', () => {
    const updatedLocationSearch = updateLocationSearchForStartupFeatureToggle({
      locationSearch: `?${startupFeatureToggleQueryParameterName}=${applockRefactoredFeatureToggleName},${conversationListCollapseFeatureToggleName}`,
      featureToggleName: applockRefactoredFeatureToggleName,
      shouldEnableFeatureToggle: false,
    });

    expect(updatedLocationSearch).toBe(
      `?${startupFeatureToggleQueryParameterName}=${conversationListCollapseFeatureToggleName}`,
    );
  });

  it('adds a startup feature toggle while preserving other enabled toggles', () => {
    const updatedLocationSearch = updateLocationSearchForStartupFeatureToggle({
      locationSearch: `?${startupFeatureToggleQueryParameterName}=${conversationListCollapseFeatureToggleName}`,
      featureToggleName: applockRefactoredFeatureToggleName,
      shouldEnableFeatureToggle: true,
    });

    expect(updatedLocationSearch).toBe(
      `?${startupFeatureToggleQueryParameterName}=${applockRefactoredFeatureToggleName}%2C${conversationListCollapseFeatureToggleName}`,
    );
  });

  it('removes only the startup feature parameter when the last feature toggle is disabled', () => {
    const updatedLocationSearch = updateLocationSearchForStartupFeatureToggle({
      locationSearch: `?${startupFeatureToggleQueryParameterName}=${applockRefactoredFeatureToggleName}&foo=bar`,
      featureToggleName: applockRefactoredFeatureToggleName,
      shouldEnableFeatureToggle: false,
    });

    expect(updatedLocationSearch).toBe('?foo=bar');
  });

  it('returns an empty search string when the last query parameter is removed', () => {
    const updatedLocationSearch = updateLocationSearchForStartupFeatureToggle({
      locationSearch: `?${startupFeatureToggleQueryParameterName}=${applockRefactoredFeatureToggleName}`,
      featureToggleName: applockRefactoredFeatureToggleName,
      shouldEnableFeatureToggle: false,
    });

    expect(updatedLocationSearch).toBe('');
  });

  it('ignores unknown feature names already present in query parameter when enabling a new toggle', () => {
    const updatedLocationSearch = updateLocationSearchForStartupFeatureToggle({
      locationSearch: `?${startupFeatureToggleQueryParameterName}=unknown-feature`,
      featureToggleName: applockRefactoredFeatureToggleName,
      shouldEnableFeatureToggle: true,
    });

    expect(updatedLocationSearch).toBe(
      `?${startupFeatureToggleQueryParameterName}=${applockRefactoredFeatureToggleName}`,
    );
  });

  it('deduplicates feature toggles when enabling an already enabled toggle', () => {
    const updatedLocationSearch = updateLocationSearchForStartupFeatureToggle({
      locationSearch: `?${startupFeatureToggleQueryParameterName}=${applockRefactoredFeatureToggleName},${applockRefactoredFeatureToggleName}`,
      featureToggleName: applockRefactoredFeatureToggleName,
      shouldEnableFeatureToggle: true,
    });

    expect(updatedLocationSearch).toBe(
      `?${startupFeatureToggleQueryParameterName}=${applockRefactoredFeatureToggleName}`,
    );
  });
});

describe('updateLocationSearchForStartupFeatureToggle session persistence', () => {
  it('persists the updated enabled toggles to local storage when enabling a toggle', () => {
    const {localStorage, getStoredValue} = createInMemoryLocalStorageStub();

    updateLocationSearchForStartupFeatureToggle({
      locationSearch: '?foo=bar',
      featureToggleName: applockRefactoredFeatureToggleName,
      shouldEnableFeatureToggle: true,
      localStorage,
    });

    expect(getStoredValue()).toBe(applockRefactoredFeatureToggleName);
  });

  it('clears local storage when the last feature toggle is disabled', () => {
    const {localStorage, getStoredValue} = createInMemoryLocalStorageStub(applockRefactoredFeatureToggleName);

    updateLocationSearchForStartupFeatureToggle({
      locationSearch: `?${startupFeatureToggleQueryParameterName}=${applockRefactoredFeatureToggleName}`,
      featureToggleName: applockRefactoredFeatureToggleName,
      shouldEnableFeatureToggle: false,
      localStorage,
    });

    expect(getStoredValue()).toBeNull();
  });

  it('keeps the remaining enabled toggles in local storage when one is disabled', () => {
    const {localStorage, getStoredValue} = createInMemoryLocalStorageStub(
      `${applockRefactoredFeatureToggleName},${conversationListCollapseFeatureToggleName}`,
    );

    updateLocationSearchForStartupFeatureToggle({
      locationSearch: `?${startupFeatureToggleQueryParameterName}=${applockRefactoredFeatureToggleName},${conversationListCollapseFeatureToggleName}`,
      featureToggleName: applockRefactoredFeatureToggleName,
      shouldEnableFeatureToggle: false,
      localStorage,
    });

    expect(getStoredValue()).toBe(conversationListCollapseFeatureToggleName);
  });

  it('does not touch local storage when no local storage is provided', () => {
    const {localStorage, getStoredValue} = createInMemoryLocalStorageStub();

    updateLocationSearchForStartupFeatureToggle({
      locationSearch: '?foo=bar',
      featureToggleName: applockRefactoredFeatureToggleName,
      shouldEnableFeatureToggle: true,
    });

    expect(getStoredValue()).toBeNull();
  });

  it('keeps localStorage-enabled toggles when enabling a toggle from a search without the query parameter', () => {
    const {localStorage, getStoredValue} = createInMemoryLocalStorageStub(conversationListCollapseFeatureToggleName);

    const updatedLocationSearch = updateLocationSearchForStartupFeatureToggle({
      locationSearch: '?foo=bar',
      featureToggleName: applockRefactoredFeatureToggleName,
      shouldEnableFeatureToggle: true,
      localStorage,
    });

    expect(updatedLocationSearch).toBe(
      `?foo=bar&${startupFeatureToggleQueryParameterName}=${applockRefactoredFeatureToggleName}%2C${conversationListCollapseFeatureToggleName}`,
    );
    expect(getStoredValue()).toBe(`${applockRefactoredFeatureToggleName},${conversationListCollapseFeatureToggleName}`);
  });

  it('keeps other localStorage-enabled toggles when disabling one from a search without the query parameter', () => {
    const {localStorage, getStoredValue} = createInMemoryLocalStorageStub(
      `${applockRefactoredFeatureToggleName},${conversationListCollapseFeatureToggleName}`,
    );

    const updatedLocationSearch = updateLocationSearchForStartupFeatureToggle({
      locationSearch: '?foo=bar',
      featureToggleName: applockRefactoredFeatureToggleName,
      shouldEnableFeatureToggle: false,
      localStorage,
    });

    expect(updatedLocationSearch).toBe(
      `?foo=bar&${startupFeatureToggleQueryParameterName}=${conversationListCollapseFeatureToggleName}`,
    );
    expect(getStoredValue()).toBe(conversationListCollapseFeatureToggleName);
  });

  it('clears local storage when disabling the last toggle from a search without the query parameter', () => {
    const {localStorage, getStoredValue} = createInMemoryLocalStorageStub(applockRefactoredFeatureToggleName);

    const updatedLocationSearch = updateLocationSearchForStartupFeatureToggle({
      locationSearch: '?foo=bar',
      featureToggleName: applockRefactoredFeatureToggleName,
      shouldEnableFeatureToggle: false,
      localStorage,
    });

    expect(updatedLocationSearch).toBe('?foo=bar');
    expect(getStoredValue()).toBeNull();
  });
});
