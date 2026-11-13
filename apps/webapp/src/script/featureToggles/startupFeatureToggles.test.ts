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
} from './startupFeatureToggles';
import {
  applockRefactoredFeatureToggleName,
  conversationListCollapseFeatureToggleName,
  disableMessagePreprocessingFeatureToggleName,
  driveBulkRestoreFeatureToggleName,
  markAsUnreadFeatureToggleName,
  troubleshooterFeatureToggleName,
  sendCallLogsFeatureToggleName,
  e2ePdfPreviewFeatureToggleName,
  startupFeatureToggleNames,
  forTestsOnlyFeatureToggleName,
  persistentBrowserLogsFeatureToggleName,
  previewDefaultEnabledStartupFeatureToggleNames,
} from './startupFeatureToggleNames';

const featureToggleNamesWithDedicatedExistenceTests = [
  applockRefactoredFeatureToggleName,
  conversationListCollapseFeatureToggleName,
  forTestsOnlyFeatureToggleName,
  disableMessagePreprocessingFeatureToggleName,
  driveBulkRestoreFeatureToggleName,
  markAsUnreadFeatureToggleName,
  troubleshooterFeatureToggleName,
  sendCallLogsFeatureToggleName,
  e2ePdfPreviewFeatureToggleName,
  persistentBrowserLogsFeatureToggleName,
] as const;

describe('startupFeatureToggles', function () {
  it('keeps persistent browser logs disabled for release and preview builds and preserves explicit opt-in alongside other toggles', () => {
    const disabled = createStartupFeatureTogglesFromLocationSearch('');
    const enabled = createStartupFeatureTogglesFromLocationSearch(
      '?enabled-features=mark-as-unread,persistent-browser-logs',
    );

    expect(disabled.isFeatureToggleEnabled(persistentBrowserLogsFeatureToggleName)).toBe(false);
    expect(previewDefaultEnabledStartupFeatureToggleNames).not.toContain(persistentBrowserLogsFeatureToggleName);
    expect(enabled.enabledFeatureToggleNames).toEqual([
      markAsUnreadFeatureToggleName,
      persistentBrowserLogsFeatureToggleName,
    ]);
  });
  it('keeps encrypted PDF previews disabled for release builds and allows explicit opt-in', () => {
    const disabled = createStartupFeatureTogglesFromLocationSearch('');
    const enabled = createStartupFeatureTogglesFromLocationSearch('?enabled-features=e2e-pdf-preview');

    expect(disabled.isFeatureToggleEnabled(e2ePdfPreviewFeatureToggleName)).toBe(false);
    expect(enabled.isFeatureToggleEnabled(e2ePdfPreviewFeatureToggleName)).toBe(true);
    expect(enabled.enabledFeatureToggleNames).toEqual([e2ePdfPreviewFeatureToggleName]);
  });

  it('keeps Mark as unread disabled by default for release builds and allows explicit opt-in', () => {
    const disabled = createStartupFeatureTogglesFromLocationSearch('');
    const enabled = createStartupFeatureTogglesFromLocationSearch('?enabled-features=mark-as-unread');

    expect(disabled.isFeatureToggleEnabled(markAsUnreadFeatureToggleName)).toBe(false);
    expect(enabled.isFeatureToggleEnabled(markAsUnreadFeatureToggleName)).toBe(true);
    expect(enabled.enabledFeatureToggleNames).toEqual([markAsUnreadFeatureToggleName]);
  });
  it.each(['?enabled-features', '?enabled-features=', '?enabled-features=%20%2C%20'])(
    'resolves an explicit empty selection to no enabled features: %s',
    locationSearch => {
      const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(locationSearch);

      expect(startupFeatureToggles.enabledFeatureToggleNames).toEqual([]);
    },
  );

  it('returns disabled toggles when the query parameter is missing', () => {
    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch('?foo=bar');

    expect(startupFeatureToggles.isFeatureToggleEnabled(applockRefactoredFeatureToggleName)).toBe(false);
    expect(startupFeatureToggles.enabledFeatureToggleNames).toEqual([]);
  });

  it('keeps the troubleshooter disabled by default', () => {
    const toggles = createStartupFeatureTogglesFromLocationSearch('');

    expect(toggles.isFeatureToggleEnabled(troubleshooterFeatureToggleName)).toBe(false);
  });

  it('enables the troubleshooter when selected in developer settings', () => {
    const toggles = createStartupFeatureTogglesFromLocationSearch(
      `?${startupFeatureToggleQueryParameterName}=${troubleshooterFeatureToggleName}`,
    );

    expect(toggles.isFeatureToggleEnabled(troubleshooterFeatureToggleName)).toBe(true);
  });

  it('keeps sending call logs disabled by default and enables it through developer settings', () => {
    expect(
      createStartupFeatureTogglesFromLocationSearch('').isFeatureToggleEnabled(sendCallLogsFeatureToggleName),
    ).toBe(false);
    const enabled = createStartupFeatureTogglesFromLocationSearch(
      `?${startupFeatureToggleQueryParameterName}=${sendCallLogsFeatureToggleName}`,
    );
    expect(enabled.isFeatureToggleEnabled(sendCallLogsFeatureToggleName)).toBe(true);
  });

  it('keeps Drive bulk restore disabled until its separate toggle is enabled', () => {
    const disabled = createStartupFeatureTogglesFromLocationSearch('');
    const enabled = createStartupFeatureTogglesFromLocationSearch(
      `?${startupFeatureToggleQueryParameterName}=${driveBulkRestoreFeatureToggleName}`,
    );

    expect(disabled.isFeatureToggleEnabled(driveBulkRestoreFeatureToggleName)).toBe(false);
    expect(enabled.isFeatureToggleEnabled(driveBulkRestoreFeatureToggleName)).toBe(true);
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

  it('enables multiple startup feature toggles', () => {
    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(
      `?${startupFeatureToggleQueryParameterName}=${conversationListCollapseFeatureToggleName},${applockRefactoredFeatureToggleName}`,
    );

    expect(startupFeatureToggles.isFeatureToggleEnabled(conversationListCollapseFeatureToggleName)).toBe(true);
    expect(startupFeatureToggles.isFeatureToggleEnabled(applockRefactoredFeatureToggleName)).toBe(true);
  });

  it('ignores unknown feature toggles from the query parameter', () => {
    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(
      `?${startupFeatureToggleQueryParameterName}=unknown-feature`,
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

  it('enables the for-tests-only feature toggle when present in the query parameter', () => {
    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(
      `?${startupFeatureToggleQueryParameterName}=${forTestsOnlyFeatureToggleName}`,
    );

    expect(startupFeatureToggles.isFeatureToggleEnabled(forTestsOnlyFeatureToggleName)).toBe(true);
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
      forTestsOnlyFeatureToggleName,
      disableMessagePreprocessingFeatureToggleName,
      driveBulkRestoreFeatureToggleName,
      markAsUnreadFeatureToggleName,
      troubleshooterFeatureToggleName,
      sendCallLogsFeatureToggleName,
      e2ePdfPreviewFeatureToggleName,
      persistentBrowserLogsFeatureToggleName,
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
