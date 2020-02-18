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

import {WebAppEvents} from 'src/script/event/WebApp';
import {EventTrackingRepository} from 'src/script/tracking/EventTrackingRepository';

describe('EventTrackingRepository', () => {
  const test_factory = new TestFactory();

  beforeEach(() => {
    return test_factory.exposeTrackingActors().then(() => {
      TestFactory.tracking_repository._isDomainAllowedForAnalytics = () => true;
    });
  });

  describe('Initialization', () => {
    it('enables error reporting, user analytics and subscribes to analytics events', () => {
      expect(TestFactory.tracking_repository.providerAPI).toBeUndefined();
      TestFactory.tracking_repository.providerAPI = true;
      spyOn(TestFactory.tracking_repository, '_enableErrorReporting').and.callThrough();
      spyOn(TestFactory.tracking_repository, '_enableAnalytics').and.callThrough();
      spyOn(TestFactory.tracking_repository, '_subscribeToAnalyticsEvents').and.callThrough();

      const properties = {
        contact_import: {
          macos: undefined,
        },
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
            improve_wire: undefined,
            report_errors: undefined,
          },
          sound: {
            alerts: 'all',
          },
        },
        version: 1,
      };
      const privacyPreference = properties.settings.privacy.improve_wire;

      expect(privacyPreference).toBeFalsy();

      return TestFactory.tracking_repository.init(true).then(() => {
        expect(TestFactory.tracking_repository.providerAPI).toBeDefined();
        expect(TestFactory.tracking_repository._enableErrorReporting).toHaveBeenCalled();
        expect(TestFactory.tracking_repository._enableAnalytics).toHaveBeenCalled();
        expect(TestFactory.tracking_repository._subscribeToAnalyticsEvents).toHaveBeenCalled();
      });
    });

    it('allows changing initial tracking properties', () => {
      TestFactory.tracking_repository.providerAPI = true;

      expect(TestFactory.tracking_repository.isErrorReportingActivated).toBe(false);
      expect(TestFactory.tracking_repository.isUserAnalyticsActivated).toBe(false);
      TestFactory.tracking_repository._trackEvent = jasmine.createSpy('_trackEvent');

      return TestFactory.tracking_repository.init(true).then(() => {
        expect(TestFactory.tracking_repository.isErrorReportingActivated).toBe(true);
        expect(TestFactory.tracking_repository.isUserAnalyticsActivated).toBe(true);
        amplify.publish(WebAppEvents.ANALYTICS.EVENT, 'i_am_an_event');

        expect(TestFactory.tracking_repository._trackEvent).toHaveBeenCalledTimes(1);
        amplify.publish(WebAppEvents.ANALYTICS.EVENT, 'i_am_another_event');

        expect(TestFactory.tracking_repository._trackEvent).toHaveBeenCalledTimes(2);
        amplify.publish(WebAppEvents.PROPERTIES.UPDATE.PRIVACY, false);

        expect(TestFactory.tracking_repository._trackEvent).toHaveBeenCalledTimes(3);
        amplify.publish(WebAppEvents.ANALYTICS.EVENT, 'i_am_not_tracking');

        expect(TestFactory.tracking_repository._trackEvent).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('User Tracking', () => {
    beforeEach(() => {
      TestFactory.tracking_repository.providerAPI = true;
      TestFactory.tracking_repository._trackEvent = jasmine.createSpy('_trackEvent');
      return TestFactory.tracking_repository.init(true);
    });

    it('immediately reports events', () => {
      amplify.publish(WebAppEvents.ANALYTICS.EVENT, 'i_am_an_event');

      expect(TestFactory.tracking_repository._trackEvent).toHaveBeenCalled();
      expect(TestFactory.tracking_repository._trackEvent).toHaveBeenCalledTimes(1);
    });

    it('allows additional parameters for events', () => {
      const event_name = 'Article View';
      const attributes = {
        'Page Name': 'Baseball Headlines',
        Section: 'Sports',
      };

      amplify.publish(WebAppEvents.ANALYTICS.EVENT, event_name, attributes);

      expect(TestFactory.tracking_repository._trackEvent).toHaveBeenCalledWith(event_name, attributes);
    });
  });

  describe('Error Tracking', () => {
    beforeEach(() => {
      jasmine.clock().install();

      TestFactory.tracking_repository.providerAPI = true;
      return TestFactory.tracking_repository.init(true);
    });

    afterEach(() => jasmine.clock().uninstall());

    it('does not log the same error twice', () => {
      // prettier-ignore
      /* eslint-disable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */
      const raygun_payload = {"OccurredOn":"2016-06-07T09:43:58.851Z","Details":{"Error":{"ClassName":"Error","Message":"Test","StackTrace":[{"LineNumber":129,"ColumnNumber":13,"ClassName":"line 129, column 13","FileName":"http://localhost:8888/script/view_model/ConversationInputViewModel.js","MethodName":"ConversationInputViewModel.z.viewModel.ConversationInputViewModel.ConversationInputViewModel.send_message"},{"LineNumber":2,"ColumnNumber":61,"ClassName":"line 2, column 61","FileName":"http://localhost:8888/script/view_model/ConversationInputViewModel.js","MethodName":"ConversationInputViewModel.send_message"},{"LineNumber":121,"ColumnNumber":17,"ClassName":"line 121, column 17","FileName":"http://localhost:8888/script/view_model/bindings/CommonBindings.js","MethodName":"ConversationInputViewModel.wrapper"},{"LineNumber":4190,"ColumnNumber":62,"ClassName":"line 4190, column 62","FileName":"http://localhost:8888/ext/js/knockout.debug.js","MethodName":"HTMLTextAreaElement.<anonymous>"},{"LineNumber":4435,"ColumnNumber":9,"ClassName":"line 4435, column 9","FileName":"http://localhost:8888/ext/js/jquery.js","MethodName":"HTMLTextAreaElement.dispatch"},{"LineNumber":4121,"ColumnNumber":28,"ClassName":"line 4121, column 28","FileName":"http://localhost:8888/ext/js/jquery.js","MethodName":"HTMLTextAreaElement.elemData.handle"}]},"Environment":{"UtcOffset":2,"Browser-Width":1765,"Browser-Height":535,"Screen-Width":1920,"Screen-Height":1080,"Color-Depth":24,"Browser":"Mozilla","Browser-Name":"Netscape","Browser-Version":"5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.79 Safari/537.36","Platform":"Win32"},"Client":{"Name":"raygun-js","Version":"2.3.2"},"UserCustomData":{},"Tags":[],"Request":{"Url":"http://localhost:8888/","QueryString":{"env":"staging"},"Headers":{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.79 Safari/537.36","Referer":"http://localhost:8888/?env=staging","Host":"localhost"}},"Version":"Not supplied","User":{"Identifier":"3b449a8d-0a50-4a56-b131-7fe3f58a4280"}}};
      /* eslint-enable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */

      let error_payload = TestFactory.tracking_repository._checkErrorPayload(raygun_payload);

      expect(error_payload).toBe(raygun_payload);

      for (let index = 0; index < 100; index++) {
        error_payload = TestFactory.tracking_repository._checkErrorPayload(raygun_payload);
      }

      expect(error_payload).toBe(false);
      jasmine.clock().mockDate(Date.now());
      jasmine.clock().tick(EventTrackingRepository.CONFIG.ERROR_REPORTING.REPORTING_THRESHOLD * 2);
      error_payload = TestFactory.tracking_repository._checkErrorPayload(raygun_payload);

      expect(error_payload).toBe(raygun_payload);
      error_payload = TestFactory.tracking_repository._checkErrorPayload(raygun_payload);

      expect(error_payload).toBe(false);
    });
  });
});
