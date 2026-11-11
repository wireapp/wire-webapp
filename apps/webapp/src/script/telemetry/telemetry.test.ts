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
  addAllConsentFeatures,
  addConsentFeatures,
  beginSession,
  changeDeviceId,
  disableOfflineMode,
  enableOfflineMode,
  endSession,
  getProviderInstance,
  initialize,
  isLoaded,
  removeAllConsentFeatures,
  removeConsentFeatures,
  setUserData,
  trackClicks,
  trackEvent,
  trackPageView,
} from './telemetry';

const queueCommand = jest.fn();
const initializeCountly = jest.fn();
const consentFeatures = [
  'sessions',
  'events',
  'views',
  'scrolls',
  'clicks',
  'forms',
  'crashes',
  'attribution',
  'users',
  'star-rating',
  'feedback',
  'location',
  'remote-config',
  'apm',
];

describe('telemetry', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'Countly', {
      configurable: true,
      value: {q: {push: queueCommand}, init: initializeCountly},
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    Reflect.deleteProperty(window, 'Countly');
  });

  it('uses the separately loaded provider without initializing on import', async () => {
    await import('./telemetry');

    expect(isLoaded()).toBe(true);
    expect(getProviderInstance()).toBe(window.Countly);
    expect(initializeCountly).not.toHaveBeenCalled();
    expect(queueCommand).not.toHaveBeenCalled();
  });

  it('initializes explicitly with the existing privacy defaults', () => {
    initialize({
      appVersion: 'test-version',
      provider: {apiKey: 'test-key', serverUrl: 'https://countly.example.test', autoSessionTracking: true},
    });

    expect(initializeCountly).toHaveBeenCalledTimes(1);
    expect(window.Countly).toEqual(
      expect.objectContaining({
        app_version: 'test-version',
        app_key: 'test-key',
        url: 'https://countly.example.test',
        debug: false,
        offline_mode: true,
        use_session_cookie: false,
        storage: 'localstorage',
        require_consent: true,
        enable_orientation_tracking: false,
      }),
    );
    expect(queueCommand.mock.calls).toEqual([[['track_sessions']]]);
  });

  it('preserves explicit configuration and queues only enabled automatic tracking', () => {
    initialize({
      appVersion: 'test-version',
      provider: {
        apiKey: 'test-key',
        serverUrl: 'https://countly.example.test',
        enableLogging: true,
        offline_mode: false,
        useSessionCookie: true,
        storage: 'none',
        requireConsent: false,
        enableOrientationTracking: true,
        autoSessionTracking: false,
        autoPageViewTracking: true,
        autoClickTracking: true,
        autoScrollTracking: true,
        autoLinksTracking: true,
        autoErrorTracking: true,
      },
    });

    expect(window.Countly).toEqual(
      expect.objectContaining({
        debug: true,
        offline_mode: false,
        use_session_cookie: true,
        storage: 'none',
        require_consent: false,
        enable_orientation_tracking: true,
      }),
    );
    expect(queueCommand.mock.calls).toEqual([
      [['track_pageview']],
      [['track_clicks']],
      [['track_scrolls']],
      [['track_links']],
      [['track_errors']],
    ]);
    expect(initializeCountly).toHaveBeenCalledTimes(1);
  });

  it('does not initialize when the standalone SDK is missing', () => {
    Reflect.deleteProperty(window, 'Countly');

    expect(isLoaded()).toBe(false);
    initialize({appVersion: 'test', provider: {apiKey: 'test', serverUrl: 'https://countly.example.test'}});

    expect(initializeCountly).not.toHaveBeenCalled();
    expect(queueCommand).not.toHaveBeenCalled();
  });

  it('preserves consent, identity, offline mode, and session commands in order', () => {
    addAllConsentFeatures();
    removeAllConsentFeatures();
    addConsentFeatures(['events']);
    removeConsentFeatures(['sessions']);
    changeDeviceId('device-id');
    changeDeviceId('merged-device-id', true);
    disableOfflineMode('device-id');
    enableOfflineMode();
    beginSession();
    endSession();

    expect(queueCommand.mock.calls).toEqual([
      [['add_consent', consentFeatures]],
      [['remove_consent', consentFeatures]],
      [['add_consent', ['events']]],
      [['remove_consent', ['sessions']]],
      [['change_id', 'device-id', false]],
      [['change_id', 'merged-device-id', true]],
      [['disable_offline_mode', 'device-id']],
      [['enable_offline_mode']],
      [['begin_session']],
      [['end_session']],
    ]);
  });

  it('preserves event fields, user properties, clicks, and page views', () => {
    trackEvent({name: 'example', count: 2, sum: 3, duration: 4, segmentation: {source: 'test'}});
    setUserData({role: 'member'});
    trackClicks();
    trackPageView('/example');

    expect(queueCommand.mock.calls).toEqual([
      [['add_event', {key: 'example', count: 2, sum: 3, dur: 4, segmentation: {source: 'test'}}]],
      [['userData.set', 'role', 'member']],
      [['userData.save']],
      [['track_clicks']],
      [['track_pageview', '/example']],
    ]);
  });
});
