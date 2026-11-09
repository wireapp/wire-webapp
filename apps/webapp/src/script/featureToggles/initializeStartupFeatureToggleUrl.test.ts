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

import {initializeStartupFeatureToggleUrl} from './initializeStartupFeatureToggleUrl';
import {forTestsOnlyFeatureToggleName, sendCallLogsFeatureToggleName} from './startupFeatureToggleNames';
import {createStartupFeatureTogglesFromLocationSearch} from './startupFeatureToggles';
import {updateLocationSearchForStartupFeatureToggle} from './startupFeatureToggleQueryParameters';

describe('initializeStartupFeatureToggleUrl', () => {
  it('initializes injected defaults while preserving the original URL, unrelated parameters, and fragment', () => {
    const url = new URL('https://example.com/app?return=a%20b&filter=one&filter=two#preferences');
    const replaceUrl = jest.fn();

    initializeStartupFeatureToggleUrl({
      url,
      defaultEnabledFeatureToggleNames: [forTestsOnlyFeatureToggleName, sendCallLogsFeatureToggleName],
      replaceUrl,
    });

    expect(replaceUrl).toHaveBeenCalledTimes(1);
    expect(replaceUrl).toHaveBeenCalledWith(
      'https://example.com/app?return=a+b&filter=one&filter=two&enabled-features=for-tests-only%2Csend-call-logs#preferences',
    );
    expect(url.href).toBe('https://example.com/app?return=a%20b&filter=one&filter=two#preferences');
  });

  it.each([
    '?enabled-features=send-call-logs',
    '?enabled-features=',
    '?enabled-features',
    '?enabled-features=unknown-feature',
    '?enabled-features=%20%2C%20',
    '?enabled-features=&enabled-features=for-tests-only',
  ])('preserves an existing selection verbatim: %s', locationSearch => {
    const replaceUrl = jest.fn();

    initializeStartupFeatureToggleUrl({
      url: new URL(`https://example.com/${locationSearch}#preferences`),
      defaultEnabledFeatureToggleNames: [forTestsOnlyFeatureToggleName],
      replaceUrl,
    });

    expect(replaceUrl).not.toHaveBeenCalled();
  });

  it('leaves a missing selection untouched when no defaults are injected', () => {
    const replaceUrl = jest.fn();

    initializeStartupFeatureToggleUrl({
      url: new URL('https://example.com/?return=a%20b#preferences'),
      defaultEnabledFeatureToggleNames: [],
      replaceUrl,
    });

    expect(replaceUrl).not.toHaveBeenCalled();
  });

  it('replaces browser history without adding entries and lets the existing resolver read the initialized URL', () => {
    const originalUrl = window.location.href;
    const originalHistoryState: unknown = window.history.state;

    try {
      window.history.replaceState({navigation: 'preserved'}, '', '/?foo=bar#preferences');
      const historyLength = window.history.length;

      initializeStartupFeatureToggleUrl({
        url: new URL(window.location.href),
        defaultEnabledFeatureToggleNames: [forTestsOnlyFeatureToggleName],
        replaceUrl(url) {
          window.history.replaceState(window.history.state, '', url);
        },
      });

      expect(window.history.length).toBe(historyLength);
      expect(window.history.state).toEqual({navigation: 'preserved'});
      expect(window.location.hash).toBe('#preferences');
      expect(createStartupFeatureTogglesFromLocationSearch(window.location.search).enabledFeatureToggleNames).toEqual([
        forTestsOnlyFeatureToggleName,
      ]);
    } finally {
      window.history.replaceState(originalHistoryState, '', originalUrl);
    }
  });

  it('does not restore defaults after the toolbar disables the last enabled feature', () => {
    const locationSearch = updateLocationSearchForStartupFeatureToggle({
      locationSearch: '?enabled-features=for-tests-only',
      featureToggleName: forTestsOnlyFeatureToggleName,
      shouldEnableFeatureToggle: false,
    });
    const replaceUrl = jest.fn();

    initializeStartupFeatureToggleUrl({
      url: new URL(`https://example.com/${locationSearch}`),
      defaultEnabledFeatureToggleNames: [forTestsOnlyFeatureToggleName],
      replaceUrl,
    });

    expect(replaceUrl).not.toHaveBeenCalled();
    expect(createStartupFeatureTogglesFromLocationSearch(locationSearch).enabledFeatureToggleNames).toEqual([]);
  });
});
