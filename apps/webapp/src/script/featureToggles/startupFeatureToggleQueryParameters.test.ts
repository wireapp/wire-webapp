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
  reliableWebsocketConnectionFeatureToggleName,
} from './startupFeatureToggleNames';
import {startupFeatureToggleQueryParameterName} from './startupFeatureToggles';
import {updateLocationSearchForStartupFeatureToggle} from './startupFeatureToggleQueryParameters';

describe('updateLocationSearchForStartupFeatureToggle', () => {
  it('adds a feature toggle to an existing query string and preserves unrelated parameters', () => {
    const updatedLocationSearch = updateLocationSearchForStartupFeatureToggle({
      locationSearch: '?foo=bar',
      featureToggleName: reliableWebsocketConnectionFeatureToggleName,
      shouldEnableFeatureToggle: true,
    });

    expect(updatedLocationSearch).toBe(
      `?foo=bar&${startupFeatureToggleQueryParameterName}=${reliableWebsocketConnectionFeatureToggleName}`,
    );
  });

  it('removes a feature toggle and preserves other enabled toggles', () => {
    const updatedLocationSearch = updateLocationSearchForStartupFeatureToggle({
      locationSearch: `?${startupFeatureToggleQueryParameterName}=${reliableWebsocketConnectionFeatureToggleName},${applockRefactoredFeatureToggleName}`,
      featureToggleName: reliableWebsocketConnectionFeatureToggleName,
      shouldEnableFeatureToggle: false,
    });

    expect(updatedLocationSearch).toBe(
      `?${startupFeatureToggleQueryParameterName}=${applockRefactoredFeatureToggleName}`,
    );
  });

  it('removes only the startup feature parameter when the last feature toggle is disabled', () => {
    const updatedLocationSearch = updateLocationSearchForStartupFeatureToggle({
      locationSearch: `?${startupFeatureToggleQueryParameterName}=${reliableWebsocketConnectionFeatureToggleName}&foo=bar`,
      featureToggleName: reliableWebsocketConnectionFeatureToggleName,
      shouldEnableFeatureToggle: false,
    });

    expect(updatedLocationSearch).toBe('?foo=bar');
  });

  it('returns an empty search string when the last query parameter is removed', () => {
    const updatedLocationSearch = updateLocationSearchForStartupFeatureToggle({
      locationSearch: `?${startupFeatureToggleQueryParameterName}=${reliableWebsocketConnectionFeatureToggleName}`,
      featureToggleName: reliableWebsocketConnectionFeatureToggleName,
      shouldEnableFeatureToggle: false,
    });

    expect(updatedLocationSearch).toBe('');
  });

  it('ignores unknown feature names already present in query parameter when enabling a new toggle', () => {
    const updatedLocationSearch = updateLocationSearchForStartupFeatureToggle({
      locationSearch: `?${startupFeatureToggleQueryParameterName}=unknown-feature`,
      featureToggleName: reliableWebsocketConnectionFeatureToggleName,
      shouldEnableFeatureToggle: true,
    });

    expect(updatedLocationSearch).toBe(
      `?${startupFeatureToggleQueryParameterName}=${reliableWebsocketConnectionFeatureToggleName}`,
    );
  });

  it('deduplicates feature toggles when enabling an already enabled toggle', () => {
    const updatedLocationSearch = updateLocationSearchForStartupFeatureToggle({
      locationSearch: `?${startupFeatureToggleQueryParameterName}=${reliableWebsocketConnectionFeatureToggleName},${reliableWebsocketConnectionFeatureToggleName}`,
      featureToggleName: reliableWebsocketConnectionFeatureToggleName,
      shouldEnableFeatureToggle: true,
    });

    expect(updatedLocationSearch).toBe(
      `?${startupFeatureToggleQueryParameterName}=${reliableWebsocketConnectionFeatureToggleName}`,
    );
  });
});
