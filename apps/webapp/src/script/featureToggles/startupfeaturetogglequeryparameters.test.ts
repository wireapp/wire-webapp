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

import {applockRefactoredFeatureToggleName, meetingsFeatureToggleName} from './startupfeaturetogglenames';
import {startupFeatureToggleQueryParameterName} from './startupfeaturetoggles';
import {updateLocationSearchForStartupFeatureToggle} from './startupfeaturetogglequeryparameters';

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
      locationSearch: `?${startupFeatureToggleQueryParameterName}=${applockRefactoredFeatureToggleName},${meetingsFeatureToggleName}`,
      featureToggleName: applockRefactoredFeatureToggleName,
      shouldEnableFeatureToggle: false,
    });

    expect(updatedLocationSearch).toBe(`?${startupFeatureToggleQueryParameterName}=${meetingsFeatureToggleName}`);
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
