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

describe('z.tracking.EventTrackingRepository', function() {
  const test_factory = new TestFactory();

  beforeEach(function(done) {
    test_factory
      .exposeTrackingActors()
      .then(function() {
        TestFactory.tracking_repository._localytics_disabled = () => false;
        TestFactory.tracking_repository._has_permission = () => true;
        done();
      })
      .catch(done.fail);
  });

  describe('Initialization', function() {
    it('initializes error reporting on an init event', function() {
      spyOn(TestFactory.tracking_repository, 'init').and.callThrough();
      spyOn(
        TestFactory.tracking_repository,
        '_enable_error_reporting',
      ).and.callThrough();

      amplify.publish(
        z.event.WebApp.ANALYTICS.INIT,
        new z.properties.Properties(),
      );
      expect(
        TestFactory.tracking_repository._enable_error_reporting,
      ).toHaveBeenCalled();
    });
  });

  describe('Tracking', function() {
    let event_name = undefined;

    beforeEach(function() {
      TestFactory.tracking_repository.tag_event = jasmine.createSpy();
      amplify.subscribe(
        z.event.WebApp.ANALYTICS.EVENT,
        TestFactory.tracking_repository.tag_event,
      );
    });

    afterEach(function() {
      amplify.unsubscribeAll(z.event.WebApp.ANALYTICS.EVENT);
    });

    it('immediately reports events', function() {
      amplify.publish(z.event.WebApp.ANALYTICS.EVENT, 'i_am_an_event');
      expect(TestFactory.tracking_repository.tag_event).toHaveBeenCalled();
      expect(TestFactory.tracking_repository.tag_event).toHaveBeenCalledTimes(
        1,
      );
    });

    it('allows additional parameters for events', function() {
      event_name = 'ArticleView';
      const attributes = {
        'Page Name': 'Baseball-Headlines',
        Section: 'Sports',
      };

      amplify.publish(z.event.WebApp.ANALYTICS.EVENT, event_name, attributes);
      expect(TestFactory.tracking_repository.tag_event).toHaveBeenCalledWith(
        event_name,
        attributes,
      );
    });
  });

  describe('Error Reporting', function() {
    beforeAll(function() {
      TestFactory.tracking_repository.init(
        new z.properties.Properties(),
        TestFactory.user_repository.self(),
      );
    });

    beforeEach(function() {
      jasmine.clock().install();
    });

    afterEach(function() {
      jasmine.clock().uninstall();
    });

    it('does not log the same error twice', function() {
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const raygun_payload = {
        OccurredOn: '2016-06-07T09:43:58.851Z',
        Details: {
          Error: {
            ClassName: 'Error',
            Message: 'Test',
            StackTrace: [
              {
                LineNumber: 129,
                ColumnNumber: 13,
                ClassName: 'line 129, column 13',
                FileName:
                  'http://localhost:8888/script/view_model/ConversationInputViewModel.js',
                MethodName:
                  'ConversationInputViewModel.z.ViewModel.ConversationInputViewModel.ConversationInputViewModel.send_message',
              },
              {
                LineNumber: 2,
                ColumnNumber: 61,
                ClassName: 'line 2, column 61',
                FileName:
                  'http://localhost:8888/script/view_model/ConversationInputViewModel.js',
                MethodName: 'ConversationInputViewModel.send_message',
              },
              {
                LineNumber: 121,
                ColumnNumber: 17,
                ClassName: 'line 121, column 17',
                FileName:
                  'http://localhost:8888/script/view_model/bindings/CommonBindings.js',
                MethodName: 'ConversationInputViewModel.wrapper',
              },
              {
                LineNumber: 4190,
                ColumnNumber: 62,
                ClassName: 'line 4190, column 62',
                FileName: 'http://localhost:8888/ext/js/knockout.debug.js',
                MethodName: 'HTMLTextAreaElement.<anonymous>',
              },
              {
                LineNumber: 4435,
                ColumnNumber: 9,
                ClassName: 'line 4435, column 9',
                FileName: 'http://localhost:8888/ext/js/jquery.js',
                MethodName: 'HTMLTextAreaElement.dispatch',
              },
              {
                LineNumber: 4121,
                ColumnNumber: 28,
                ClassName: 'line 4121, column 28',
                FileName: 'http://localhost:8888/ext/js/jquery.js',
                MethodName: 'HTMLTextAreaElement.elemData.handle',
              },
            ],
          },
          Environment: {
            UtcOffset: 2,
            'Browser-Width': 1765,
            'Browser-Height': 535,
            'Screen-Width': 1920,
            'Screen-Height': 1080,
            'Color-Depth': 24,
            Browser: 'Mozilla',
            'Browser-Name': 'Netscape',
            'Browser-Version':
              '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.79 Safari/537.36',
            Platform: 'Win32',
          },
          Client: {Name: 'raygun-js', Version: '2.3.2'},
          UserCustomData: {},
          Tags: [],
          Request: {
            Url: 'http://localhost:8888/',
            QueryString: {env: 'staging'},
            Headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.79 Safari/537.36',
              Referer: 'http://localhost:8888/?env=staging',
              Host: 'localhost',
            },
          },
          Version: 'Not supplied',
          User: {Identifier: '3b449a8d-0a50-4a56-b131-7fe3f58a4280'},
        },
      };
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      let error_payload = TestFactory.tracking_repository._check_error_payload(
        raygun_payload,
      );
      expect(error_payload).toBe(raygun_payload);

      _.times(
        100,
        () =>
          (error_payload = TestFactory.tracking_repository._check_error_payload(
            raygun_payload,
          )),
      );
      expect(error_payload).toBe(false);

      jasmine.clock().mockDate(Date.now());
      jasmine
        .clock()
        .tick(
          z.tracking.EventTrackingRepository.CONFIG.ERROR_REPORTING_THRESHOLD *
            2,
        );

      error_payload = TestFactory.tracking_repository._check_error_payload(
        raygun_payload,
      );
      expect(error_payload).toBe(raygun_payload);

      error_payload = TestFactory.tracking_repository._check_error_payload(
        raygun_payload,
      );
      expect(error_payload).toBe(false);
    });
  });

  describe('_attach_promise_rejection_handler', function() {
    const error_description = 'Unit test error';

    beforeAll(function() {
      TestFactory.tracking_repository._attach_promise_rejection_handler();
    });

    afterAll(function() {
      TestFactory.tracking_repository._detach_promise_rejection_handler();
    });

    it('handles a Promise rejected with an Error that is uncaught', function(
      done,
    ) {
      window.onerror = function(
        error_message,
        file_name,
        line_number,
        column_number,
        error,
      ) {
        expect(error_message).toBe(error_description);
        expect(error.message).toBe(error_description);
        done();
      };

      Promise.reject(new Error('Unit test error'));
    });

    it('handles a Promise rejected with a String that is uncaught', function(
      done,
    ) {
      window.onerror = function(error_message, file_name) {
        expect(error_message).toBe(error_description);
        expect(file_name).toBeNull();
        done();
      };

      /* eslint-disable prefer-promise-reject-errors */
      Promise.reject(error_description);
      /* eslint-enable prefer-promise-reject-errors */
    });

    it('ignores a rejected Promise that is caught', function(done) {
      window.onerror = done.fail;

      Promise.reject(new Error(error_description)).catch(done);
    });
  });
});
