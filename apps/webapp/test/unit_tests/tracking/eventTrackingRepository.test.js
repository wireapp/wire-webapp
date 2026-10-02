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

import {WebAppEvents} from '@wireapp/webapp-events';

import {EventTrackingRepository} from 'Repositories/tracking/eventTrackingRepository';
import {resetStoreValue, storeValue} from 'Util/storageUtil';

import {TestFactory} from '../../helper/TestFactory';

describe('EventTrackingRepository', () => {
  const testFactory = new TestFactory();

  beforeEach(() => {
    return testFactory.exposeTrackingActors().then(() => {
      testFactory.tracking_repository.isDomainAllowedForAnalytics = () => true;
    });
  });

  describe('Initialization', () => {
    afterEach(() => {
      for (const storageKey of [
        EventTrackingRepository.CONFIG.USER_ANALYTICS.COUNTLY_DEVICE_ID_LOCAL_STORAGE_KEY,
        EventTrackingRepository.CONFIG.USER_ANALYTICS.COUNTLY_SYNCED_AT_LEAST_ONCE_LOCAL_STORAGE_KEY,
        EventTrackingRepository.CONFIG.USER_ANALYTICS.COUNTLY_FAILED_TO_MIGRATE_DEVICE_ID,
        EventTrackingRepository.CONFIG.USER_ANALYTICS.COUNTLY_UNSYNCED_DEVICE_ID_LOCAL_STORAGE_KEY,
      ]) {
        resetStoreValue(storageKey);
      }
      jest.restoreAllMocks();
    });

    it.each([
      [undefined, 1],
      [null, 1],
      [false, 1],
      [0, 1],
      ['', 1],
      [true, 0],
      [1, 0],
      [[], 0],
      [{}, 0],
    ])('preserves the truthiness of persisted synchronization marker %p', async (storedMarker, expectedSyncs) => {
      storeValue(EventTrackingRepository.CONFIG.USER_ANALYTICS.COUNTLY_DEVICE_ID_LOCAL_STORAGE_KEY, 'existing-device');
      storeValue(
        EventTrackingRepository.CONFIG.USER_ANALYTICS.COUNTLY_SYNCED_AT_LEAST_ONCE_LOCAL_STORAGE_KEY,
        storedMarker,
      );
      resetStoreValue(EventTrackingRepository.CONFIG.USER_ANALYTICS.COUNTLY_FAILED_TO_MIGRATE_DEVICE_ID);
      resetStoreValue(EventTrackingRepository.CONFIG.USER_ANALYTICS.COUNTLY_UNSYNCED_DEVICE_ID_LOCAL_STORAGE_KEY);
      const synchronize = jest.spyOn(testFactory.message_repository, 'sendCountlySync').mockResolvedValue(undefined);
      jest.spyOn(testFactory.tracking_repository, 'toggleTelemetry').mockResolvedValue(undefined);

      await testFactory.tracking_repository.init(false);

      expect(synchronize).toHaveBeenCalledTimes(expectedSyncs);
    });

    it.skip('enables error reporting, user analytics and subscribes to analytics events', () => {
      spyOn(testFactory.tracking_repository, 'startErrorReporting').and.callThrough();
      spyOn(testFactory.tracking_repository, 'subscribeToProductEvents').and.callThrough();

      const properties = {
        contact_import: {},
        enable_debugging: false,
        settings: {
          emoji: {
            replace_inline: true,
          },
          interface: {
            theme: 'default',
          },
          notifications: 'on',
          previews: {
            send: true,
          },
          privacy: {
            report_errors: undefined,
          },
          sound: {
            alerts: 'all',
          },
        },
        version: 1,
      };

      return testFactory.tracking_repository.init(true).then(() => {
        expect(testFactory.tracking_repository.startErrorReporting).toHaveBeenCalled();
        expect(testFactory.tracking_repository.subscribeToProductEvents).toHaveBeenCalled();
      });
    });

    it.skip('allows changing initial tracking properties', () => {
      expect(testFactory.tracking_repository.isErrorReportingActivated).toBe(false);
      expect(testFactory.tracking_repository.isProductReportingActivated).toBe(false);
      testFactory.tracking_repository.trackProductReportingEvent = jasmine.createSpy('trackProductReportingEvent');

      return testFactory.tracking_repository.init(true).then(() => {
        expect(testFactory.tracking_repository.isErrorReportingActivated).toBe(true);
        expect(testFactory.tracking_repository.isProductReportingActivated).toBe(true);
        amplify.publish(WebAppEvents.ANALYTICS.EVENT, 'i_am_an_event');

        expect(testFactory.tracking_repository.trackProductReportingEvent).toHaveBeenCalledTimes(1);
        amplify.publish(WebAppEvents.ANALYTICS.EVENT, 'i_am_another_event');

        expect(testFactory.tracking_repository.trackProductReportingEvent).toHaveBeenCalledTimes(2);
        amplify.publish(WebAppEvents.PROPERTIES.UPDATE.PRIVACY, false);

        expect(testFactory.tracking_repository.trackProductReportingEvent).toHaveBeenCalledTimes(3);
        amplify.publish(WebAppEvents.ANALYTICS.EVENT, 'i_am_not_tracking');

        expect(testFactory.tracking_repository.trackProductReportingEvent).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('User Tracking', () => {
    beforeEach(() => {
      testFactory.tracking_repository.trackProductReportingEvent = jasmine.createSpy('trackProductReportingEvent');
      return testFactory.tracking_repository.init(true);
    });

    it.skip('immediately reports events', () => {
      amplify.publish(WebAppEvents.ANALYTICS.EVENT, 'i_am_an_event');

      expect(testFactory.tracking_repository.trackProductReportingEvent).toHaveBeenCalled();
      expect(testFactory.tracking_repository.trackProductReportingEvent).toHaveBeenCalledTimes(1);
    });

    it.skip('allows additional parameters for events', () => {
      const event_name = 'Article View';
      const segmentations = {
        'Page Name': 'Baseball Headlines',
        Section: 'Sports',
      };

      amplify.publish(WebAppEvents.ANALYTICS.EVENT, event_name, segmentations);

      expect(testFactory.tracking_repository.trackProductReportingEvent).toHaveBeenCalledWith(
        event_name,
        segmentations,
      );
    });
  });
});
