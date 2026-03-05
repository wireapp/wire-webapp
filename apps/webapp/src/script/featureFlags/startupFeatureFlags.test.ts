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
  allowedStartupFeatureFlagNames,
  createStartupFeatureFlagMapFromLocationSearch,
  isStartupFeatureFlagEnabled,
  startupFeatureFlagQueryParameterName,
} from './startupFeatureFlags';

describe('startupFeatureFlags', function () {
  const reliableWebsocketConnectionFeatureFlagName = 'reliable-websocket-connection';

  it('returns an empty feature flag map when the query parameter is missing', function () {
    const startupFeatureFlagMap = createStartupFeatureFlagMapFromLocationSearch('?foo=bar');

    expect(isStartupFeatureFlagEnabled(startupFeatureFlagMap, reliableWebsocketConnectionFeatureFlagName)).toBe(false);
    expect(Object.keys(startupFeatureFlagMap)).toHaveLength(0);
  });

  it('enables a whitelisted feature flag when present in the query parameter', function () {
    const startupFeatureFlagMap = createStartupFeatureFlagMapFromLocationSearch(
      `?${startupFeatureFlagQueryParameterName}=${reliableWebsocketConnectionFeatureFlagName}`,
    );

    expect(isStartupFeatureFlagEnabled(startupFeatureFlagMap, reliableWebsocketConnectionFeatureFlagName)).toBe(true);
  });

  it('enables whitelisted flags and ignores unknown values in the same parameter', function () {
    const startupFeatureFlagMap = createStartupFeatureFlagMapFromLocationSearch(
      `?${startupFeatureFlagQueryParameterName}=${reliableWebsocketConnectionFeatureFlagName},unknown-feature`,
    );

    expect(isStartupFeatureFlagEnabled(startupFeatureFlagMap, reliableWebsocketConnectionFeatureFlagName)).toBe(true);
    expect('unknown-feature' in startupFeatureFlagMap).toBe(false);
  });

  it('ignores unknown feature flags from the query parameter', function () {
    const startupFeatureFlagMap = createStartupFeatureFlagMapFromLocationSearch(
      `?${startupFeatureFlagQueryParameterName}=unknown-feature`,
    );

    expect(Object.keys(startupFeatureFlagMap)).toHaveLength(0);
    expect('unknown-feature' in startupFeatureFlagMap).toBe(false);
  });

  it('keeps only whitelisted feature flags when known and unknown values are mixed', function () {
    const startupFeatureFlagMap = createStartupFeatureFlagMapFromLocationSearch(
      `?${startupFeatureFlagQueryParameterName}=unknown-feature,${reliableWebsocketConnectionFeatureFlagName}`,
    );

    expect(isStartupFeatureFlagEnabled(startupFeatureFlagMap, reliableWebsocketConnectionFeatureFlagName)).toBe(true);
    expect('unknown-feature' in startupFeatureFlagMap).toBe(false);
  });

  it('trims whitespace around feature flag names', function () {
    const startupFeatureFlagMap = createStartupFeatureFlagMapFromLocationSearch(
      `?${startupFeatureFlagQueryParameterName}= ${reliableWebsocketConnectionFeatureFlagName} `,
    );

    expect(isStartupFeatureFlagEnabled(startupFeatureFlagMap, reliableWebsocketConnectionFeatureFlagName)).toBe(true);
  });

  it('deduplicates duplicated feature flags', function () {
    const startupFeatureFlagMap = createStartupFeatureFlagMapFromLocationSearch(
      `?${startupFeatureFlagQueryParameterName}=${reliableWebsocketConnectionFeatureFlagName},${reliableWebsocketConnectionFeatureFlagName}`,
    );

    expect(isStartupFeatureFlagEnabled(startupFeatureFlagMap, reliableWebsocketConnectionFeatureFlagName)).toBe(true);
    expect(Object.keys(startupFeatureFlagMap)).toEqual([reliableWebsocketConnectionFeatureFlagName]);
  });

  it('ignores empty list entries in the feature flag query parameter', function () {
    const startupFeatureFlagMap = createStartupFeatureFlagMapFromLocationSearch(
      `?${startupFeatureFlagQueryParameterName}=,${reliableWebsocketConnectionFeatureFlagName},,`,
    );

    expect(isStartupFeatureFlagEnabled(startupFeatureFlagMap, reliableWebsocketConnectionFeatureFlagName)).toBe(true);
    expect(Object.keys(startupFeatureFlagMap)).toEqual([reliableWebsocketConnectionFeatureFlagName]);
  });

  it('treats feature flag names as case-sensitive', function () {
    const uppercaseFeatureFlagName = reliableWebsocketConnectionFeatureFlagName.toUpperCase();
    const startupFeatureFlagMap = createStartupFeatureFlagMapFromLocationSearch(
      `?${startupFeatureFlagQueryParameterName}=${uppercaseFeatureFlagName}`,
    );

    expect(isStartupFeatureFlagEnabled(startupFeatureFlagMap, reliableWebsocketConnectionFeatureFlagName)).toBe(
      false,
    );
    expect(uppercaseFeatureFlagName in startupFeatureFlagMap).toBe(false);
  });

  it('returns a frozen feature flag map', function () {
    const startupFeatureFlagMap = createStartupFeatureFlagMapFromLocationSearch(
      `?${startupFeatureFlagQueryParameterName}=${reliableWebsocketConnectionFeatureFlagName}`,
    );

    expect(Object.isFrozen(startupFeatureFlagMap)).toBe(true);
  });

  it('contains only whitelisted values in allowedStartupFeatureFlagNames', function () {
    expect(allowedStartupFeatureFlagNames).toEqual([reliableWebsocketConnectionFeatureFlagName]);
  });
});
