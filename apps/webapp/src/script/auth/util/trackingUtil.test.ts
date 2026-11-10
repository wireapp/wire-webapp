/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

jest.mock('../../Config');
jest.mock('../../util/uuid');

import {Config} from '../../Config';
import {createUuid} from '../../util/uuid';

import {
  EventName,
  initializeTelemetry,
  PageView,
  resetTelemetrySession,
  Segmentation,
  trackTelemetryEvent,
  trackTelemetryPageView,
} from './trackingUtil';

const reportingDeviceIdKey = 'REPORTING_DEVICE_ID';
const generatedDeviceId = 'test-device-id';
const userAgent = 'test-user-agent';
const defaultConfiguration = {
  COUNTLY_ENABLE_LOGGING: true,
  VERSION: '1.2.3',
  COUNTLY_API_KEY: 'api-key',
  COUNTLY_SERVER_URL: 'https://server.url',
};
const queueCommand = jest.fn();
const initializeCountly = jest.fn();

describe('trackingUtil', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'Countly', {
      configurable: true,
      value: {q: {push: queueCommand}, init: initializeCountly},
    });
    localStorage.clear();
    resetTelemetrySession();
    jest.clearAllMocks();
    (Config.getConfig as jest.Mock).mockReturnValue(defaultConfiguration);
    (createUuid as jest.Mock).mockReturnValue(generatedDeviceId);
    jest.spyOn(window, 'addEventListener').mockImplementation(jest.fn());
    jest.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Reflect.deleteProperty(window, 'Countly');
    localStorage.clear();
  });

  describe('initializeTelemetry', () => {
    it('configures Countly, grants consent, persists a device id, and starts a session', () => {
      initializeTelemetry();

      expect(initializeCountly).toHaveBeenCalledTimes(1);
      expect(window.Countly).toEqual(
        expect.objectContaining({
          app_version: defaultConfiguration.VERSION,
          app_key: defaultConfiguration.COUNTLY_API_KEY,
          url: defaultConfiguration.COUNTLY_SERVER_URL,
          debug: false,
          offline_mode: true,
          require_consent: true,
          use_session_cookie: false,
        }),
      );
      expect(localStorage.getItem(reportingDeviceIdKey)).toBe(generatedDeviceId);
      expect(queueCommand.mock.calls).toEqual([
        [['track_clicks']],
        [['add_consent', expect.arrayContaining(['sessions', 'events', 'views'])]],
        [['change_id', generatedDeviceId, false]],
        [['disable_offline_mode', generatedDeviceId]],
        [['begin_session']],
      ]);
    });

    it('reuses the persisted device id', () => {
      localStorage.setItem(reportingDeviceIdKey, 'existing-device-id');

      initializeTelemetry();

      expect(createUuid).not.toHaveBeenCalled();
      expect(queueCommand).toHaveBeenCalledWith(['change_id', 'existing-device-id', false]);
      expect(queueCommand).toHaveBeenCalledWith(['disable_offline_mode', 'existing-device-id']);
    });

    it('ends the session before unloading', () => {
      const registerListener = jest.spyOn(window, 'addEventListener');

      initializeTelemetry();

      expect(registerListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));
      expect(registerListener).toHaveBeenCalledTimes(1);
      const unloadListener = registerListener.mock.lastCall?.[1];
      if (typeof unloadListener !== 'function') {
        throw new Error('Expected a beforeunload listener');
      }
      queueCommand.mockClear();
      unloadListener(new Event('beforeunload'));

      expect(queueCommand).toHaveBeenCalledWith(['end_session']);
      window.removeEventListener('beforeunload', unloadListener);
    });

    it.each([{COUNTLY_ENABLE_LOGGING: false}, {COUNTLY_API_KEY: ''}])(
      'does not initialize with disabled telemetry: %p',
      configurationOverride => {
        (Config.getConfig as jest.Mock).mockReturnValue({...defaultConfiguration, ...configurationOverride});

        initializeTelemetry();

        expect(initializeCountly).not.toHaveBeenCalled();
        expect(queueCommand).not.toHaveBeenCalled();
        expect(localStorage.getItem(reportingDeviceIdKey)).toBeNull();
      },
    );

    it('does not initialize when the SDK is unavailable', () => {
      Reflect.deleteProperty(window, 'Countly');

      initializeTelemetry();

      expect(initializeCountly).not.toHaveBeenCalled();
      expect(localStorage.getItem(reportingDeviceIdKey)).toBeNull();
    });
  });

  it('tracks an event with application, browser, and caller segmentation', () => {
    initializeTelemetry();
    queueCommand.mockClear();

    trackTelemetryEvent(EventName.ACCOUNT_SETUP_SCREEN_1, {
      [Segmentation.MULTIPLE_PASSWORD_TRIES]: true,
    });

    expect(queueCommand).toHaveBeenCalledWith([
      'add_event',
      expect.objectContaining({
        key: EventName.ACCOUNT_SETUP_SCREEN_1,
        segmentation: {
          [Segmentation.APP_VERSION]: defaultConfiguration.VERSION,
          [Segmentation.OS_VERSION]: userAgent,
          [Segmentation.MULTIPLE_PASSWORD_TRIES]: true,
        },
      }),
    ]);
  });

  it('tracks page views after initialization', () => {
    initializeTelemetry();
    queueCommand.mockClear();

    trackTelemetryPageView(PageView.ACCOUNT_COMPLETION_SCREEN_4);

    expect(queueCommand).toHaveBeenCalledWith(['track_pageview', PageView.ACCOUNT_COMPLETION_SCREEN_4]);
  });

  it('does not initialize or track before explicitly requested', () => {
    trackTelemetryEvent(EventName.ACCOUNT_SETUP_SCREEN_1);
    trackTelemetryPageView(PageView.ACCOUNT_COMPLETION_SCREEN_4);

    expect(initializeCountly).not.toHaveBeenCalled();
    expect(queueCommand).not.toHaveBeenCalled();
  });

  it('resets the device id, ends the session, and stops tracking', () => {
    initializeTelemetry();
    queueCommand.mockClear();

    resetTelemetrySession();
    trackTelemetryEvent(EventName.ACCOUNT_SETUP_SCREEN_1);
    trackTelemetryPageView(PageView.ACCOUNT_COMPLETION_SCREEN_4);

    expect(localStorage.getItem(reportingDeviceIdKey)).toBeNull();
    expect(queueCommand.mock.calls).toEqual([[['end_session']]]);
  });
});
