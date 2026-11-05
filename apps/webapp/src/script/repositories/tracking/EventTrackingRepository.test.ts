/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {WebSocketClient} from '@wireapp/api-client/lib/tcp';
import {amplify} from 'amplify';
import {EventEmitter} from 'events';

import {WebAppEvents} from '@wireapp/webapp-events';

import {Config} from '../../Config';
import {EventName} from './EventName';
import {EventTrackingRepository} from './EventTrackingRepository';
import {disableForcedErrorReporting} from './Telemetry.helpers';

type TrackingConstructorInputs = ConstructorParameters<typeof EventTrackingRepository>;

describe('WebSocket retry product reporting', () => {
  const webSocket = new EventEmitter();
  const retryDetails = {retryCount: 9, retryDurationInMilliseconds: 65_000};
  const telemetry = {
    isLoaded: jest.fn(),
    changeDeviceId: jest.fn(),
    addAllConsentFeatures: jest.fn(),
    removeAllConsentFeatures: jest.fn(),
    initialize: jest.fn(),
    disableOfflineMode: jest.fn(),
    endSession: jest.fn(),
    beginSession: jest.fn(),
    setUserData: jest.fn(),
    trackEvent: jest.fn(),
  };
  let configuration: ReturnType<typeof Config.getConfig>;

  beforeEach(() => {
    disableForcedErrorReporting();
    webSocket.removeAllListeners();
    Object.values(telemetry).forEach(mock => {mock.mockReset();});
    telemetry.isLoaded.mockReturnValue(true);
    configuration = {
      ...Config.getConfig(),
      COUNTLY_API_KEY: 'test-key',
      COUNTLY_ALLOWED_BACKEND: 'https://backend.example.test',
      BACKEND_REST: 'https://backend.example.test',
      COUNTLY_FORCE_REPORTING: false,
    };
    jest.spyOn(Config, 'getConfig').mockImplementation(() => {return configuration;});
    window.history.replaceState({}, '', '/?tracking=true');
  });

  afterEach(() => {
    webSocket.removeAllListeners();
    amplify.unsubscribeAll(WebAppEvents.USER.EVENT_FROM_BACKEND);
    amplify.unsubscribeAll(WebAppEvents.PROPERTIES.UPDATE.PRIVACY.TELEMETRY_SHARING);
    amplify.unsubscribeAll(WebAppEvents.ANALYTICS.EVENT);
    amplify.unsubscribeAll(WebAppEvents.LIFECYCLE.SIGNED_OUT);
    disableForcedErrorReporting();
    window.history.replaceState({}, '', '/');
    jest.restoreAllMocks();
  });

  function createRepository(): EventTrackingRepository {
    return new EventTrackingRepository(
      {sendCountlySync: jest.fn().mockResolvedValue(undefined)} as unknown as TrackingConstructorInputs[0],
      {isTeam: () => {return false;}} as TrackingConstructorInputs[1],
      {connectedUsers: () => {return [];}} as unknown as TrackingConstructorInputs[2],
      {webSocket, telemetry},
    );
  }

  function emitRetry(): void {
    webSocket.emit(WebSocketClient.TOPIC.ON_LONG_RUNNING_RETRY, retryDetails);
  }

  it('reports the transport retry information through existing product reporting', async () => {
    const repository = createRepository();
    await repository.init(true);
    telemetry.trackEvent.mockClear();

    emitRetry();

    expect(telemetry.trackEvent).toHaveBeenCalledTimes(1);
    expect(telemetry.trackEvent).toHaveBeenCalledWith({
      name: EventName.CONNECTIVITY.RETRYING_FOR_ONE_MINUTE,
      segmentation: expect.objectContaining({
        retry_count: 9,
        retry_duration_in_milliseconds: 65_000,
        transport: 'websocket',
      }),
    });
    expect(telemetry.setUserData).toHaveBeenCalled();
  });

  it('does not subscribe or report without consent', async () => {
    const repository = createRepository();
    await repository.init(false);
    emitRetry();

    expect(webSocket.listenerCount(WebSocketClient.TOPIC.ON_LONG_RUNNING_RETRY)).toBe(0);
    expect(telemetry.trackEvent).not.toHaveBeenCalled();
    expect(telemetry.removeAllConsentFeatures).toHaveBeenCalledTimes(1);
  });

  it('does not enable retry reporting during a device-ID migration without consent', async () => {
    const repository = createRepository();
    await repository.init(false);
    telemetry.changeDeviceId.mockImplementation(() => {
      expect(webSocket.listenerCount(WebSocketClient.TOPIC.ON_LONG_RUNNING_RETRY)).toBe(0);
      emitRetry();
    });

    await repository.migrateDeviceId('replacement-tracking-id');

    expect(telemetry.changeDeviceId).toHaveBeenCalled();
    expect(telemetry.trackEvent).not.toHaveBeenCalledWith(expect.objectContaining({
      name: EventName.CONNECTIVITY.RETRYING_FOR_ONE_MINUTE,
    }));
  });

  it('removes the retry subscription on consent withdrawal and rejects an already dispatched callback', async () => {
    const repository = createRepository();
    await repository.init(true);
    const retryListener = webSocket.listeners(WebSocketClient.TOPIC.ON_LONG_RUNNING_RETRY)[0];
    if (retryListener === undefined) {
      throw new Error('Expected active retry subscription');
    }
    await repository.init(false);
    telemetry.trackEvent.mockClear();

    emitRetry();
    retryListener(retryDetails);

    expect(webSocket.listenerCount(WebSocketClient.TOPIC.ON_LONG_RUNNING_RETRY)).toBe(0);
    expect(telemetry.trackEvent).not.toHaveBeenCalled();
    expect(telemetry.endSession).toHaveBeenCalledTimes(1);
  });

  it('initializes and subscribes once across concurrent and repeated initialization', async () => {
    const subscriptions = jest.spyOn(amplify, 'subscribe');
    const repository = createRepository();
    await Promise.all([repository.init(true), repository.init(true)]);
    await repository.init(true);
    telemetry.trackEvent.mockClear();

    emitRetry();

    expect(webSocket.listenerCount(WebSocketClient.TOPIC.ON_LONG_RUNNING_RETRY)).toBe(1);
    expect(telemetry.initialize).toHaveBeenCalledTimes(1);
    expect(telemetry.beginSession).toHaveBeenCalledTimes(1);
    expect(telemetry.trackEvent).toHaveBeenCalledTimes(1);
    expect(subscriptions.mock.calls.filter(call => {
      return call[0] === WebAppEvents.PROPERTIES.UPDATE.PRIVACY.TELEMETRY_SHARING;
    })).toHaveLength(1);
  });

  it('resubscribes once after disable and re-enable', async () => {
    const repository = createRepository();
    await repository.init(true);
    await repository.init(false);
    await repository.init(true);
    await repository.init(true);
    telemetry.trackEvent.mockClear();

    emitRetry();

    expect(webSocket.listenerCount(WebSocketClient.TOPIC.ON_LONG_RUNNING_RETRY)).toBe(1);
    expect(telemetry.trackEvent).toHaveBeenCalledTimes(1);
    expect(telemetry.initialize).toHaveBeenCalledTimes(1);
    expect(telemetry.beginSession).toHaveBeenCalledTimes(2);
  });

  it('honors consent changes delivered by the existing privacy event', async () => {
    const repository = createRepository();
    await repository.init(true);
    amplify.publish(WebAppEvents.PROPERTIES.UPDATE.PRIVACY.TELEMETRY_SHARING, false);
    telemetry.trackEvent.mockClear();

    emitRetry();

    expect(webSocket.listenerCount(WebSocketClient.TOPIC.ON_LONG_RUNNING_RETRY)).toBe(0);
    expect(telemetry.trackEvent).not.toHaveBeenCalled();
  });

  it('does not subscribe on a backend outside the telemetry allowlist', async () => {
    configuration = {...configuration, COUNTLY_ALLOWED_BACKEND: 'https://other.example.test'};
    await createRepository().init(true);
    emitRetry();

    expect(webSocket.listenerCount(WebSocketClient.TOPIC.ON_LONG_RUNNING_RETRY)).toBe(0);
    expect(telemetry.initialize).not.toHaveBeenCalled();
    expect(telemetry.trackEvent).not.toHaveBeenCalled();
  });

  it('honors domain tracking restrictions even with consent', async () => {
    window.history.replaceState({}, '', '/?tracking=false');
    await createRepository().init(true);
    emitRetry();

    expect(webSocket.listenerCount(WebSocketClient.TOPIC.ON_LONG_RUNNING_RETRY)).toBe(0);
    expect(telemetry.trackEvent).not.toHaveBeenCalled();
  });

  it('does not subscribe when telemetry is unavailable', async () => {
    telemetry.isLoaded.mockReturnValue(false);
    await createRepository().init(true);
    emitRetry();

    expect(webSocket.listenerCount(WebSocketClient.TOPIC.ON_LONG_RUNNING_RETRY)).toBe(0);
    expect(telemetry.trackEvent).not.toHaveBeenCalled();
  });

  it('preserves Q2 forced reporting in configured environments', async () => {
    configuration = {...configuration, COUNTLY_FORCE_REPORTING: true};
    const repository = createRepository();
    await repository.init(false);
    telemetry.trackEvent.mockClear();
    emitRetry();

    expect(webSocket.listenerCount(WebSocketClient.TOPIC.ON_LONG_RUNNING_RETRY)).toBe(1);
    expect(telemetry.trackEvent).toHaveBeenCalledTimes(1);
  });

  it('can initialize after an earlier attempt lacked a Countly key', async () => {
    configuration = {...configuration, COUNTLY_API_KEY: '', COUNTLY_FORCE_REPORTING: true};
    const repository = createRepository();
    await repository.init(true);
    expect(webSocket.listenerCount(WebSocketClient.TOPIC.ON_LONG_RUNNING_RETRY)).toBe(0);
    configuration = {...configuration, COUNTLY_API_KEY: 'test-key'};
    await repository.init(true);
    telemetry.trackEvent.mockClear();
    emitRetry();

    expect(webSocket.listenerCount(WebSocketClient.TOPIC.ON_LONG_RUNNING_RETRY)).toBe(1);
    expect(telemetry.trackEvent).toHaveBeenCalledTimes(1);
  });
});
