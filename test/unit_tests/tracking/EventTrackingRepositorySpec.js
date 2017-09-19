/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

'use strict';

// grunt test_init && grunt test_run:tracking/EventTrackingRepository

describe('z.tracking.EventTrackingRepository', () => {
  const test_factory = new TestFactory();

  describe('init', () => {
    beforeEach((done) => {
      test_factory.exposeTrackingActors()
        .then(() => {
          TestFactory.tracking_repository._is_domain_allowed_for_tracking = () => true;
          done();
        })
        .catch(done.fail);
    });

    it('enables error reporting, user tracking and subscribes to tracking events by default', (done) => {
      expect(TestFactory.tracking_repository.mixpanel).toBeUndefined();
      spyOn(TestFactory.tracking_repository, '_enable_error_reporting').and.callThrough();
      spyOn(TestFactory.tracking_repository, '_init_tracking').and.callThrough();
      spyOn(TestFactory.tracking_repository, '_subscribe_to_tracking_events').and.callThrough();

      const properties = new z.properties.Properties();
      TestFactory.tracking_repository.init(properties.settings.privacy.improve_wire)
        .then(() => {
          expect(TestFactory.tracking_repository.mixpanel).toBeDefined();
          expect(TestFactory.tracking_repository._enable_error_reporting).toHaveBeenCalled();
          expect(TestFactory.tracking_repository._init_tracking).toHaveBeenCalled();
          expect(TestFactory.tracking_repository._subscribe_to_tracking_events).toHaveBeenCalled();
          done();
        });
    });

    it('enables error reporting and user tracking', (done) => {
      TestFactory.tracking_repository._track_event = jasmine.createSpy('_track_event');

      expect(TestFactory.tracking_repository.is_error_tracking_activated).toBe(false);
      expect(TestFactory.tracking_repository.is_user_tracking_activated).toBe(false);

      TestFactory.tracking_repository.init(true)
        .then(() => {
          expect(TestFactory.tracking_repository.is_error_tracking_activated).toBe(true);
          expect(TestFactory.tracking_repository.is_user_tracking_activated).toBe(true);

          amplify.publish(z.event.WebApp.ANALYTICS.EVENT, 'i_am_an_event');
          expect(TestFactory.tracking_repository._track_event).toHaveBeenCalledTimes(1);

          amplify.publish(z.event.WebApp.ANALYTICS.EVENT, 'i_am_another_event');
          expect(TestFactory.tracking_repository._track_event).toHaveBeenCalledTimes(2);

          amplify.publish(z.event.WebApp.PROPERTIES.UPDATE.PRIVACY, false);
          expect(TestFactory.tracking_repository._track_event).toHaveBeenCalledTimes(3);

          amplify.publish(z.event.WebApp.ANALYTICS.EVENT, 'i_am_not_tracking');
          expect(TestFactory.tracking_repository._track_event).toHaveBeenCalledTimes(3);
          done();
        });
    });
  });
});
