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
  forTestsOnlyFeatureToggleName,
  previewDefaultEnabledStartupFeatureToggleNames,
  selectPreviewDefaultEnabledStartupFeatureToggleNames,
  sendCallLogsFeatureToggleName,
  startupFeatureToggleNames,
  startupFeatureToggleRegistry,
} from './startupFeatureToggleNames';

describe('selectPreviewDefaultEnabledStartupFeatureToggleNames', () => {
  it('selects enabled definitions and excludes disabled definitions in registry order', () => {
    const featureDefinitions = [
      {name: applockRefactoredFeatureToggleName, previewDefaultEnabled: true},
      {name: forTestsOnlyFeatureToggleName, previewDefaultEnabled: false},
      {name: sendCallLogsFeatureToggleName, previewDefaultEnabled: true},
    ] as const;

    const actualDefaultNames = selectPreviewDefaultEnabledStartupFeatureToggleNames(featureDefinitions);
    const expectedDefaultNames = [applockRefactoredFeatureToggleName, sendCallLogsFeatureToggleName];

    expect(actualDefaultNames).toEqual(expectedDefaultNames);
  });

  it('returns no defaults when every fixture definition is disabled', () => {
    const featureDefinitions = [
      {name: applockRefactoredFeatureToggleName, previewDefaultEnabled: false},
      {name: sendCallLogsFeatureToggleName, previewDefaultEnabled: false},
    ] as const;

    const actualDefaultNames = selectPreviewDefaultEnabledStartupFeatureToggleNames(featureDefinitions);

    expect(actualDefaultNames).toEqual([]);
  });

  it('accepts an empty registry', () => {
    const actualDefaultNames = selectPreviewDefaultEnabledStartupFeatureToggleNames([]);

    expect(actualDefaultNames).toEqual([]);
  });

  it('derives the exported defaults from registered feature definitions', () => {
    const expectedDefaultNames = selectPreviewDefaultEnabledStartupFeatureToggleNames(startupFeatureToggleRegistry);

    expect(previewDefaultEnabledStartupFeatureToggleNames).toEqual(expectedDefaultNames);
    expect(startupFeatureToggleNames).toEqual(expect.arrayContaining(previewDefaultEnabledStartupFeatureToggleNames));
  });

  it('keeps the test-only flag explicitly opted out of preview defaults', () => {
    expect(startupFeatureToggleRegistry).toContainEqual({
      name: forTestsOnlyFeatureToggleName,
      previewDefaultEnabled: false,
    });
    expect(previewDefaultEnabledStartupFeatureToggleNames).not.toContain(forTestsOnlyFeatureToggleName);
  });
});
