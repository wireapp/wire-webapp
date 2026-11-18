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

import {createClock} from '@enormora/clock/clock';

import {createApplicationApiClient} from './createApplicationApiClient';

import {initializeStartupFeatureToggleUrl} from '../featureToggles/initializeStartupFeatureToggleUrl';
import {
  markAsUnreadFeatureToggleName,
  previewDefaultEnabledStartupFeatureToggleNames,
  websocketListenerLifecycleFeatureToggleName,
} from '../featureToggles/startupFeatureToggleNames';
import {updateLocationSearchForStartupFeatureToggle} from '../featureToggles/startupFeatureToggleQueryParameters';
import {createStartupFeatureTogglesFromLocationSearch} from '../featureToggles/startupFeatureToggles';

function initializeUrl(url: URL, preview: boolean): URL {
  let initializedUrl = url;
  initializeStartupFeatureToggleUrl({
    url,
    defaultEnabledFeatureToggleNames: preview ? previewDefaultEnabledStartupFeatureToggleNames : [],
    replaceUrl(replacement) {
      initializedUrl = new URL(replacement);
    },
  });

  return initializedUrl;
}

describe('createApplicationApiClient', () => {
  const optIn = '?enabled-features=websocket-listener-lifecycle';

  it.each([
    {scenario: 'preview defaults', preview: true, query: '', implementation: 'corrected', markAsUnread: true},
    {scenario: 'release defaults', preview: false, query: '', implementation: 'legacy', markAsUnread: false},
    {scenario: 'preview opt-in', preview: true, query: optIn, implementation: 'corrected', markAsUnread: false},
    {scenario: 'release opt-in', preview: false, query: optIn, implementation: 'corrected', markAsUnread: false},
    {
      scenario: 'preview opt-out',
      preview: true,
      query: '?enabled-features=',
      implementation: 'legacy',
      markAsUnread: false,
    },
    {
      scenario: 'release opt-out',
      preview: false,
      query: '?enabled-features=',
      implementation: 'legacy',
      markAsUnread: false,
    },
    {
      scenario: 'preview selection of another feature',
      preview: true,
      query: '?enabled-features=mark-as-unread',
      implementation: 'legacy',
      markAsUnread: true,
    },
  ])('selects and logs the lifecycle for $scenario', options => {
    const {preview, query, implementation, markAsUnread} = options;
    const url = initializeUrl(new URL(`https://example.com/${query}`), preview);
    const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(url.search);
    const info = jest.fn();
    using apiClient = createApplicationApiClient({clock: createClock(), startupFeatureToggles, logger: {info}});

    expect(apiClient.transport.ws.lifecycleImplementation).toBe(implementation);
    expect(startupFeatureToggles.isFeatureToggleEnabled(markAsUnreadFeatureToggleName)).toBe(markAsUnread);
    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith(expect.any(String), {
      subsystem: 'websocket-lifecycle',
      event: 'websocket-lifecycle-initialized',
      implementation,
    });
  });

  it('keeps the session selection stable and honors the opt-out at the next preview startup', () => {
    const url = initializeUrl(new URL(`https://example.com/${optIn}`), true);
    const clock = createClock();
    const logger = {info: jest.fn()};
    using apiClient = createApplicationApiClient({
      clock,
      startupFeatureToggles: createStartupFeatureTogglesFromLocationSearch(url.search),
      logger,
    });

    url.search = updateLocationSearchForStartupFeatureToggle({
      locationSearch: url.search,
      featureToggleName: websocketListenerLifecycleFeatureToggleName,
      shouldEnableFeatureToggle: false,
    });
    expect(url.search).toBe('?enabled-features=');
    expect(apiClient.transport.ws.lifecycleImplementation).toBe('corrected');

    const reloadedUrl = initializeUrl(new URL(url.href), true);
    using reloadedClient = createApplicationApiClient({
      clock,
      startupFeatureToggles: createStartupFeatureTogglesFromLocationSearch(reloadedUrl.search),
      logger,
    });
    expect(reloadedClient.transport.ws.lifecycleImplementation).toBe('legacy');
  });
});
