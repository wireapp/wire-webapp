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
  allowedStartupFeatureToggleNames,
  createStartupFeatureTogglesFromLocationSearch,
  startupFeatureToggleQueryParameterName,
  startupFeatureToggleLocalStorageKey,
} from './startupFeatureToggles';
import {
  applockRefactoredFeatureToggleName,
  conversationListCollapseFeatureToggleName,
  disableMessagePreprocessingFeatureToggleName,
  startupFeatureToggleNames,
  viewerPermissionFeatureToggleName,
} from './startupFeatureToggleNames';

const featureToggleNamesWithDedicatedExistenceTests = [
  applockRefactoredFeatureToggleName,
  conversationListCollapseFeatureToggleName,
  viewerPermissionFeatureToggleName,
  disableMessagePreprocessingFeatureToggleName,
] as const;

describe('startupFeatureToggles', function () {
  it('returns disabled toggles when the query parameter is missing', () => {
    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch('?foo=bar');

    expect(startupFeatureToggles.isFeatureToggleEnabled(applockRefactoredFeatureToggleName)).toBe(false);
    expect(startupFeatureToggles.enabledFeatureToggleNames).toEqual([]);
  });

  it('enables a whitelisted feature toggle when present in the query parameter', () => {
    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(
      `?${startupFeatureToggleQueryParameterName}=${applockRefactoredFeatureToggleName}`,
    );

    expect(startupFeatureToggles.isFeatureToggleEnabled(applockRefactoredFeatureToggleName)).toBe(true);
  });

  it('enables whitelisted toggles and ignores unknown values in the same parameter', () => {
    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(
      `?${startupFeatureToggleQueryParameterName}=${applockRefactoredFeatureToggleName},unknown-feature`,
    );

    expect(startupFeatureToggles.isFeatureToggleEnabled(applockRefactoredFeatureToggleName)).toBe(true);
    expect(startupFeatureToggles.enabledFeatureToggleNames).not.toContain('unknown-feature');
  });

  it('ignores unknown feature toggles from the query parameter', () => {
    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(
      `?${startupFeatureToggleQueryParameterName}=unknown-feature`,
    );

    expect(startupFeatureToggles.enabledFeatureToggleNames).toEqual([]);
  });

  it('does not treat meetings as a startup feature toggle', () => {
    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(
      `?${startupFeatureToggleQueryParameterName}=meetings`,
    );

    expect(startupFeatureToggles.enabledFeatureToggleNames).toEqual([]);
  });

  it('keeps only whitelisted feature toggles when known and unknown values are mixed', () => {
    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(
      `?${startupFeatureToggleQueryParameterName}=unknown-feature,${applockRefactoredFeatureToggleName}`,
    );

    expect(startupFeatureToggles.isFeatureToggleEnabled(applockRefactoredFeatureToggleName)).toBe(true);
    expect(startupFeatureToggles.enabledFeatureToggleNames).not.toContain('unknown-feature');
  });

  it('enables the applock refactored feature toggle when present in the query parameter', () => {
    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(
      `?${startupFeatureToggleQueryParameterName}=${applockRefactoredFeatureToggleName}`,
    );

    expect(startupFeatureToggles.isFeatureToggleEnabled(applockRefactoredFeatureToggleName)).toBe(true);
  });

  it('enables the conversation list collapse feature toggle when present in the query parameter', () => {
    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(
      `?${startupFeatureToggleQueryParameterName}=${conversationListCollapseFeatureToggleName}`,
    );

    expect(startupFeatureToggles.isFeatureToggleEnabled(conversationListCollapseFeatureToggleName)).toBe(true);
  });

  it('enables the viewer permission feature toggle when present in the query parameter', () => {
    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(
      `?${startupFeatureToggleQueryParameterName}=${viewerPermissionFeatureToggleName}`,
    );

    expect(startupFeatureToggles.isFeatureToggleEnabled(viewerPermissionFeatureToggleName)).toBe(true);
  });

  it('enables the disable message preprocessing feature toggle when present in the query parameter', () => {
    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(
      `?${startupFeatureToggleQueryParameterName}=${disableMessagePreprocessingFeatureToggleName}`,
    );

    expect(startupFeatureToggles.isFeatureToggleEnabled(disableMessagePreprocessingFeatureToggleName)).toBe(true);
  });

  it('trims whitespace around feature toggle names', () => {
    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(
      `?${startupFeatureToggleQueryParameterName}= ${applockRefactoredFeatureToggleName} `,
    );

    expect(startupFeatureToggles.isFeatureToggleEnabled(applockRefactoredFeatureToggleName)).toBe(true);
  });

  it('deduplicates duplicated feature toggles', () => {
    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(
      `?${startupFeatureToggleQueryParameterName}=${applockRefactoredFeatureToggleName},${applockRefactoredFeatureToggleName}`,
    );

    expect(startupFeatureToggles.isFeatureToggleEnabled(applockRefactoredFeatureToggleName)).toBe(true);
    expect(startupFeatureToggles.enabledFeatureToggleNames).toEqual([applockRefactoredFeatureToggleName]);
  });

  it('ignores empty list entries in the feature toggle query parameter', () => {
    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(
      `?${startupFeatureToggleQueryParameterName}=,${applockRefactoredFeatureToggleName},,`,
    );

    expect(startupFeatureToggles.isFeatureToggleEnabled(applockRefactoredFeatureToggleName)).toBe(true);
    expect(startupFeatureToggles.enabledFeatureToggleNames).toEqual([applockRefactoredFeatureToggleName]);
  });

  it('treats feature toggle names as case-sensitive', () => {
    const uppercaseFeatureToggleName = applockRefactoredFeatureToggleName.toUpperCase();
    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(
      `?${startupFeatureToggleQueryParameterName}=${uppercaseFeatureToggleName}`,
    );

    expect(startupFeatureToggles.isFeatureToggleEnabled(applockRefactoredFeatureToggleName)).toBe(false);
    expect(startupFeatureToggles.enabledFeatureToggleNames).not.toContain(uppercaseFeatureToggleName);
  });

  it('contains only whitelisted values in allowedStartupFeatureToggleNames', () => {
    expect(allowedStartupFeatureToggleNames).toEqual([
      applockRefactoredFeatureToggleName,
      conversationListCollapseFeatureToggleName,
      viewerPermissionFeatureToggleName,
      disableMessagePreprocessingFeatureToggleName,
    ]);
  });

  it('requires a dedicated existence test for every startup feature toggle name', () => {
    expect(featureToggleNamesWithDedicatedExistenceTests).toEqual(startupFeatureToggleNames);
  });

  it('does not expose mutable enabled toggle state', () => {
    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(
      `?${startupFeatureToggleQueryParameterName}=${applockRefactoredFeatureToggleName}`,
    );

    expect('enabledFeatureToggleNameSet' in startupFeatureToggles).toBe(false);
  });
});

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

describe('startupFeatureToggles session persistence', () => {
  it('falls back to local storage when the query parameter is missing', () => {
    const {localStorage} = createInMemoryLocalStorageStub(applockRefactoredFeatureToggleName);

    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch('?foo=bar', localStorage);

    expect(startupFeatureToggles.isFeatureToggleEnabled(applockRefactoredFeatureToggleName)).toBe(true);
    expect(startupFeatureToggles.enabledFeatureToggleNames).toEqual([applockRefactoredFeatureToggleName]);
  });

  it('prefers the query parameter over local storage', () => {
    const {localStorage} = createInMemoryLocalStorageStub(applockRefactoredFeatureToggleName);

    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(
      `?${startupFeatureToggleQueryParameterName}=${viewerPermissionFeatureToggleName}`,
      localStorage,
    );

    expect(startupFeatureToggles.isFeatureToggleEnabled(applockRefactoredFeatureToggleName)).toBe(false);
    expect(startupFeatureToggles.isFeatureToggleEnabled(viewerPermissionFeatureToggleName)).toBe(true);
  });

  it('persists query parameter toggles to local storage', () => {
    const {localStorage, getStoredValue} = createInMemoryLocalStorageStub();

    createStartupFeatureTogglesFromLocationSearch(
      `?${startupFeatureToggleQueryParameterName}=${applockRefactoredFeatureToggleName}`,
      localStorage,
    );

    expect(getStoredValue()).toBe(applockRefactoredFeatureToggleName);
  });

  it('clears local storage when the query parameter is present but empty', () => {
    const {localStorage, getStoredValue} = createInMemoryLocalStorageStub(applockRefactoredFeatureToggleName);

    createStartupFeatureTogglesFromLocationSearch(`?${startupFeatureToggleQueryParameterName}=`, localStorage);

    expect(getStoredValue()).toBeNull();
  });

  it('does not read from local storage when no local storage is provided', () => {
    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch('?foo=bar');

    expect(startupFeatureToggles.enabledFeatureToggleNames).toEqual([]);
  });

  it('ignores unknown feature toggles from local storage', () => {
    const {localStorage} = createInMemoryLocalStorageStub('unknown-feature');

    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch('?foo=bar', localStorage);

    expect(startupFeatureToggles.enabledFeatureToggleNames).toEqual([]);
  });

  it('trims whitespace around feature toggle names from local storage', () => {
    const {localStorage} = createInMemoryLocalStorageStub(` ${applockRefactoredFeatureToggleName} `);

    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch('?foo=bar', localStorage);

    expect(startupFeatureToggles.isFeatureToggleEnabled(applockRefactoredFeatureToggleName)).toBe(true);
  });
});
