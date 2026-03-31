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
  collaboraNewDocumentCreationMenuFeatureToggleName,
  countlyIncrementalBackoffRetryReportingFeatureToggleName,
  reliableWebsocketConnectionFeatureToggleName,
  startupFeatureToggleNames,
} from './startupFeatureToggleNames';

const featureToggleNamesWithDedicatedExistenceTests = [
  reliableWebsocketConnectionFeatureToggleName,
  collaboraNewDocumentCreationMenuFeatureToggleName,
  countlyIncrementalBackoffRetryReportingFeatureToggleName,
] as const;

describe('startupFeatureToggles', function () {
  it('returns disabled toggles when the query parameter is missing', () => {
    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch('?foo=bar');

    expect(startupFeatureToggles.isFeatureToggleEnabled(reliableWebsocketConnectionFeatureToggleName)).toBe(false);
    expect(startupFeatureToggles.getEnabledFeatureToggleNames()).toEqual([]);
  });

  it('enables a whitelisted feature toggle when present in the query parameter', () => {
    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(
      `?${startupFeatureToggleQueryParameterName}=${reliableWebsocketConnectionFeatureToggleName}`,
    );

    expect(startupFeatureToggles.isFeatureToggleEnabled(reliableWebsocketConnectionFeatureToggleName)).toBe(true);
  });

  it('enables whitelisted toggles and ignores unknown values in the same parameter', () => {
    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(
      `?${startupFeatureToggleQueryParameterName}=${reliableWebsocketConnectionFeatureToggleName},unknown-feature`,
    );

    expect(startupFeatureToggles.isFeatureToggleEnabled(reliableWebsocketConnectionFeatureToggleName)).toBe(true);
    expect(startupFeatureToggles.getEnabledFeatureToggleNames()).not.toContain('unknown-feature');
  });

  it('ignores unknown feature toggles from the query parameter', () => {
    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(
      `?${startupFeatureToggleQueryParameterName}=unknown-feature`,
    );

    expect(startupFeatureToggles.getEnabledFeatureToggleNames()).toEqual([]);
  });

  it('enables the collabora new document creation feature toggle when present in the query parameter', () => {
    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(
      `?${startupFeatureToggleQueryParameterName}=${collaboraNewDocumentCreationMenuFeatureToggleName}`,
    );

    expect(startupFeatureToggles.isFeatureToggleEnabled(collaboraNewDocumentCreationMenuFeatureToggleName)).toBe(true);
  });

  it('keeps only whitelisted feature toggles when known and unknown values are mixed', () => {
    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(
      `?${startupFeatureToggleQueryParameterName}=unknown-feature,${reliableWebsocketConnectionFeatureToggleName}`,
    );

    expect(startupFeatureToggles.isFeatureToggleEnabled(reliableWebsocketConnectionFeatureToggleName)).toBe(true);
    expect(startupFeatureToggles.getEnabledFeatureToggleNames()).not.toContain('unknown-feature');
  });

  it('enables the countly incremental backoff retry reporting feature toggle when present in the query parameter', () => {
    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(
      `?${startupFeatureToggleQueryParameterName}=${countlyIncrementalBackoffRetryReportingFeatureToggleName}`,
    );

    expect(
      startupFeatureToggles.isFeatureToggleEnabled(countlyIncrementalBackoffRetryReportingFeatureToggleName),
    ).toBe(true);
  });

  it('trims whitespace around feature toggle names', () => {
    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(
      `?${startupFeatureToggleQueryParameterName}= ${reliableWebsocketConnectionFeatureToggleName} `,
    );

    expect(startupFeatureToggles.isFeatureToggleEnabled(reliableWebsocketConnectionFeatureToggleName)).toBe(true);
  });

  it('deduplicates duplicated feature toggles', () => {
    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(
      `?${startupFeatureToggleQueryParameterName}=${reliableWebsocketConnectionFeatureToggleName},${reliableWebsocketConnectionFeatureToggleName}`,
    );

    expect(startupFeatureToggles.isFeatureToggleEnabled(reliableWebsocketConnectionFeatureToggleName)).toBe(true);
    expect(startupFeatureToggles.getEnabledFeatureToggleNames()).toEqual([reliableWebsocketConnectionFeatureToggleName]);
  });

  it('ignores empty list entries in the feature toggle query parameter', () => {
    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(
      `?${startupFeatureToggleQueryParameterName}=,${reliableWebsocketConnectionFeatureToggleName},,`,
    );

    expect(startupFeatureToggles.isFeatureToggleEnabled(reliableWebsocketConnectionFeatureToggleName)).toBe(true);
    expect(startupFeatureToggles.getEnabledFeatureToggleNames()).toEqual([reliableWebsocketConnectionFeatureToggleName]);
  });

  it('treats feature toggle names as case-sensitive', () => {
    const uppercaseFeatureToggleName = reliableWebsocketConnectionFeatureToggleName.toUpperCase();
    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(
      `?${startupFeatureToggleQueryParameterName}=${uppercaseFeatureToggleName}`,
    );

    expect(startupFeatureToggles.isFeatureToggleEnabled(reliableWebsocketConnectionFeatureToggleName)).toBe(
      false,
    );
    expect(startupFeatureToggles.getEnabledFeatureToggleNames()).not.toContain(uppercaseFeatureToggleName);
  });

  it('contains only whitelisted values in allowedStartupFeatureToggleNames', () => {
    expect(allowedStartupFeatureToggleNames).toEqual([
      reliableWebsocketConnectionFeatureToggleName,
      collaboraNewDocumentCreationMenuFeatureToggleName,
      countlyIncrementalBackoffRetryReportingFeatureToggleName,
    ]);
  });

  it('requires a dedicated existence test for every startup feature toggle name', () => {
    expect(featureToggleNamesWithDedicatedExistenceTests).toEqual(startupFeatureToggleNames);
  });

  it('does not expose mutable enabled toggle state', () => {
    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(
      `?${startupFeatureToggleQueryParameterName}=${reliableWebsocketConnectionFeatureToggleName}`,
    );

    expect('enabledFeatureToggleNameSet' in startupFeatureToggles).toBe(false);
  });
});
