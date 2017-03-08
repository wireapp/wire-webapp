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
    it 'initializes error reporting on an init event', ->
      spyOn(tracking_repository, 'init').and.callThrough()
      spyOn(tracking_repository, '_enable_error_reporting').and.callThrough()

      amplify.publish z.event.WebApp.ANALYTICS.INIT, new z.properties.Properties()
      expect(tracking_repository._enable_error_reporting).toHaveBeenCalled()

  describe 'Tracking', ->
    event_name = undefined

    beforeEach ->
      tracking_repository.tag_event = jasmine.createSpy()
      amplify.subscribe z.event.WebApp.ANALYTICS.EVENT, tracking_repository.tag_event

    afterEach ->
      amplify.unsubscribeAll z.event.WebApp.ANALYTICS.EVENT

    it 'immediately reports events', ->
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, 'i_am_an_event'
      expect(tracking_repository.tag_event).toHaveBeenCalled()
      expect(tracking_repository.tag_event).toHaveBeenCalledTimes 1

    it 'allows additional parameters for events', ->
      event_name = 'ArticleView'
      attributes =
        'Page Name': 'Baseball-Headlines'
        'Section': 'Sports'

      amplify.publish z.event.WebApp.ANALYTICS.EVENT, event_name, attributes
      expect(tracking_repository.tag_event).toHaveBeenCalledWith event_name, attributes

  describe 'Error Reporting', ->
    beforeAll ->
      properties = new z.properties.Properties()
      self_user = user_repository.self()
      tracking_repository.init properties, self_user

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
