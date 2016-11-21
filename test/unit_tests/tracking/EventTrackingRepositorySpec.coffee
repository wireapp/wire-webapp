#
# Wire
# Copyright (C) 2016 Wire Swiss GmbH
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see http://www.gnu.org/licenses/.
#

# grunt test_init && grunt test_run:tracking/EventTrackingRepository

describe 'z.tracking.EventTrackingRepository', ->
  test_factory = new TestFactory()

  beforeEach (done) ->
    test_factory.exposeTrackingActors()
    .then ->
      tracking_repository._localytics_disabled = -> return false
      tracking_repository._has_permission = -> return true
      done()
    .catch done.fail

  describe 'Initialization', ->
    it 'initializes session values when parameters are supplied', ->
      expect(Object.keys(tracking_repository.session_values).length).toBeGreaterThan 0
      expect(tracking_repository.session_started).toBeTruthy()

    it 'does not initialize session values when it is created without parameters', ->
      repository = new z.tracking.EventTrackingRepository()
      expect(Object.keys(repository.session_values).length).toBe 0
      expect(repository.session_started).toBeFalsy()

    it 'initializes error reporting on an init event', ->
      spyOn(tracking_repository, 'init').and.callThrough()
      spyOn(tracking_repository, '_enable_error_reporting').and.callThrough()

      amplify.publish z.event.WebApp.ANALYTICS.INIT, new z.properties.Properties()
      expect(tracking_repository._enable_error_reporting).toHaveBeenCalled()

  describe 'Tracking', ->
    event_name = undefined

    beforeAll ->
      event_name = Object.keys(tracking_repository.session_values)[0]

    beforeEach ->
      amplify.subscribe z.event.WebApp.ANALYTICS.EVENT, tracking_repository.track_event

    afterEach ->
      amplify.unsubscribeAll z.event.WebApp.ANALYTICS.EVENT

    it 'counts up tracking values on incoming tracking events', ->
      expect(tracking_repository.session_values[event_name]).toEqual 0

      amplify.publish z.event.WebApp.ANALYTICS.EVENT, event_name
      expect(tracking_repository.session_values[event_name]).toEqual 1

      amplify.publish z.event.WebApp.ANALYTICS.EVENT, event_name
      expect(tracking_repository.session_values[event_name]).toEqual 2

      amplify.publish z.event.WebApp.ANALYTICS.EVENT, event_name
      expect(tracking_repository.session_values[event_name]).toEqual 3

    it 'counts up tracking values on incoming tracking events with numbers', ->
      expect(tracking_repository.session_values[event_name]).toEqual 0

      amplify.publish z.event.WebApp.ANALYTICS.EVENT, event_name, 10
      expect(tracking_repository.session_values[event_name]).toEqual 10

      amplify.publish z.event.WebApp.ANALYTICS.EVENT, event_name, 10
      expect(tracking_repository.session_values[event_name]).toEqual 20

      amplify.publish z.event.WebApp.ANALYTICS.EVENT, event_name, 10
      expect(tracking_repository.session_values[event_name]).toEqual 30

      amplify.publish z.event.WebApp.ANALYTICS.EVENT, event_name
      expect(tracking_repository.session_values[event_name]).toEqual 31

    it 'immediately reports events (which are not session events)', ->
      tracking_repository._tag_and_upload_event = jasmine.createSpy()

      amplify.publish z.event.WebApp.ANALYTICS.EVENT, 'i_am_not_a_session_event'
      expect(tracking_repository._tag_and_upload_event).toHaveBeenCalled()
      expect(tracking_repository._tag_and_upload_event).toHaveBeenCalledTimes 1

    it 'collects session events to report them later (no immediate reporting)', ->
      tracking_repository._tag_and_upload_event = jasmine.createSpy()

      amplify.publish z.event.WebApp.ANALYTICS.EVENT, event_name
      expect(tracking_repository._tag_and_upload_event).not.toHaveBeenCalled()

    it 'allows additional parameters for non-session events', ->
      tracking_repository._tag_and_upload_event = jasmine.createSpy()

      event_name = 'ArticleView'
      attributes =
        'Page Name': 'Baseball-Headlines'
        'Section': 'Sports'

      amplify.publish z.event.WebApp.ANALYTICS.EVENT, event_name, attributes
      expect(tracking_repository._tag_and_upload_event).toHaveBeenCalledWith event_name, attributes

  describe 'Error Reporting', ->
    beforeAll ->
      properties = new z.properties.Properties()
      self_user = user_repository.self()
      tracking_repository.init properties, self_user

    it 'does not log the same error twice', ->
      # @formatter:off
      raygun_payload = {"OccurredOn":"2016-06-07T09:43:58.851Z","Details":{"Error":{"ClassName":"Error","Message":"Test","StackTrace":[{"LineNumber":129,"ColumnNumber":13,"ClassName":"line 129, column 13","FileName":"http://localhost:8888/script/view_model/ConversationInputViewModel.js","MethodName":"ConversationInputViewModel.z.ViewModel.ConversationInputViewModel.ConversationInputViewModel.send_message"},{"LineNumber":2,"ColumnNumber":61,"ClassName":"line 2, column 61","FileName":"http://localhost:8888/script/view_model/ConversationInputViewModel.js","MethodName":"ConversationInputViewModel.send_message"},{"LineNumber":121,"ColumnNumber":17,"ClassName":"line 121, column 17","FileName":"http://localhost:8888/script/view_model/bindings/CommonBindings.js","MethodName":"ConversationInputViewModel.wrapper"},{"LineNumber":4190,"ColumnNumber":62,"ClassName":"line 4190, column 62","FileName":"http://localhost:8888/ext/js/knockout.debug.js","MethodName":"HTMLTextAreaElement.<anonymous>"},{"LineNumber":4435,"ColumnNumber":9,"ClassName":"line 4435, column 9","FileName":"http://localhost:8888/ext/js/jquery.js","MethodName":"HTMLTextAreaElement.dispatch"},{"LineNumber":4121,"ColumnNumber":28,"ClassName":"line 4121, column 28","FileName":"http://localhost:8888/ext/js/jquery.js","MethodName":"HTMLTextAreaElement.elemData.handle"}]},"Environment":{"UtcOffset":2,"Browser-Width":1765,"Browser-Height":535,"Screen-Width":1920,"Screen-Height":1080,"Color-Depth":24,"Browser":"Mozilla","Browser-Name":"Netscape","Browser-Version":"5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.79 Safari/537.36","Platform":"Win32"},"Client":{"Name":"raygun-js","Version":"2.3.2"},"UserCustomData":{},"Tags":[],"Request":{"Url":"http://localhost:8888/","QueryString":{"env":"staging"},"Headers":{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.79 Safari/537.36","Referer":"http://localhost:8888/?env=staging","Host":"localhost"}},"Version":"Not supplied","User":{"Identifier":"3b449a8d-0a50-4a56-b131-7fe3f58a4280"}}}
      another_raygun_payload = {"OccurredOn":"2016-06-07T11:57:46.945Z","Details":{"Error":{"ClassName":"Error","Message":"WebSocket","StackTrace":[{"LineNumber":183,"ColumnNumber":13,"ClassName":"line 183, column 13","FileName":"http://localhost:8888/script/event/WebSocketService.js","MethodName":"WebSocketService.z.event.WebSocketService.WebSocketService.send_ping"},{"LineNumber":3,"ColumnNumber":59,"ClassName":"line 3, column 59","FileName":"http://localhost:8888/script/event/WebSocketService.js","MethodName":"at "}]},"Environment":{"UtcOffset":2,"Browser-Width":1765,"Browser-Height":535,"Screen-Width":1920,"Screen-Height":1080,"Color-Depth":24,"Browser":"Mozilla","Browser-Name":"Netscape","Browser-Version":"5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.79 Safari/537.36","Platform":"Win32"},"Client":{"Name":"raygun-js","Version":"2.3.2"},"UserCustomData":{},"Tags":[],"Request":{"Url":"http://localhost:8888/","QueryString":{},"Headers":{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.79 Safari/537.36","Referer":"http://localhost:8888/auth/","Host":"localhost"}},"Version":"Not supplied","User":{"Identifier":"77f64048-75b1-45a9-b746-228640c5e33f"}}}
      # @formatter:on
      expect(tracking_repository.reported_errors().length).toBe 0

      return_value = tracking_repository._check_error_payload raygun_payload
      expect(return_value).toBe raygun_payload
      expect(tracking_repository.reported_errors().length).toBe 1

      return_value = tracking_repository._check_error_payload raygun_payload
      expect(return_value).toBe false
      expect(tracking_repository.reported_errors().length).toBe 1

      return_value = tracking_repository._check_error_payload another_raygun_payload
      expect(return_value).toBe another_raygun_payload
      expect(tracking_repository.reported_errors().length).toBe 2

    it 'resets the memorized errors', ->
      for i in [0...500]
        faked_payload =
          Details:
            Error:
              ClassName: 'FakeError' + i

        tracking_repository._check_error_payload faked_payload

      expect(tracking_repository.reported_errors().length).toBe 500

      for i in [0...501]
        faked_payload =
          Details:
            Error:
              ClassName: 'AnotherFakeError' + i

        tracking_repository._check_error_payload faked_payload

      expect(tracking_repository.reported_errors().length).toBe 1

  describe '_attach_promise_rejection_handler', ->
    error_description = 'Unit test error'

    beforeAll ->
      tracking_repository._attach_promise_rejection_handler()

    afterAll ->
      tracking_repository._detach_promise_rejection_handler()

    it 'handles a Promise rejected with an Error that is uncaught', (done) ->
      window.onerror = (error_message, file_name, line_number, column_number, error) ->
        expect(error_message).toBe error_description
        expect(error.message).toBe error_description
        done()

      Promise.reject new Error 'Unit test error'

    it 'handles a Promise rejected with a String that is uncaught', (done) ->
      window.onerror = (error_message, file_name) ->
        expect(error_message).toBe error_description
        expect(file_name).toBeNull()
        done()

      Promise.reject 'Unit test error'

    it 'ignores a rejected Promise that is caught', (done) ->
      window.onerror = done.fail

      Promise.reject new Error error_description
      .catch done
