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

window.z ?= {}
z.tracking ?= {}

z.tracking.config =
  SESSION_TIMEOUT: 180000 # milliseconds

LOCALYTICS =
  APP_KEY: '905792736c9f17c3464fd4e-60d90c82-d14a-11e4-af66-009c5fda0a25'
  TRACKING_INTERVAL: 60000 # milliseconds
  DISABLED_DOMAINS: [
    'localhost'
    'wire-webapp'
  ]

RAYGUN =
  API_KEY: '5hvAMmz8wTXaHBYqu2TFUQ=='

if z.util.Environment.frontend.is_production()
  RAYGUN.API_KEY = 'lAkLCPLx3ysnsXktajeHmw=='
  LOCALYTICS.APP_KEY = 'f19c50ccf7bff11992798f0-59fac3b8-ad88-11e6-ff9e-00ae30fe7875'

###
Tracker for user actions which uses Localytics as a reference implementation but can be easily used with other services.

@see https://support.localytics.com/Javascript
@see http://docs.localytics.com/#Dev/Instrument/js-tag-events.html
###
class z.tracking.EventTrackingRepository
  constructor: (@user_repository, @conversation_repository) ->
    @logger = new z.util.Logger 'z.tracking.EventTrackingRepository', z.config.LOGGER.OPTIONS

    @localytics = undefined # Localytics
    @session_interval = undefined # Interval to track the Localytics session
    @tracking_id = undefined # Tracking ID of the self user
    @properties = undefined # Reference to the properties

    @reported_errors = ko.observableArray()
    @reported_errors.subscribe => @reported_errors [] if @reported_errors().length > 999
    @session_values = {}

    if @user_repository is undefined and @conversation_repository is undefined
      @init_without_user_tracking()
    else
      @session_started = Date.now()
      @_set_empty_session_data()
      amplify.subscribe z.event.WebApp.ANALYTICS.INIT, @init

  ###
  @param properties [z.properties.Properties]
  ###
  init: (properties) =>
    @properties = properties
    @tracking_id = @user_repository.self().tracking_id
    @logger.info 'Initialize tracking and error reporting'

    if not @_localytics_disabled() and @_has_permission()
      @_enable_error_reporting()
      @start_session()
      amplify.subscribe z.event.WebApp.ANALYTICS.EVENT, @track_event

    @_subscribe_to_events()

  init_without_user_tracking: =>
    @_enable_error_reporting()

    if not @_localytics_disabled()
      if not @localytics
        @_init_localytics window, document, 'script', @localytics
      @_start_session()
      amplify.subscribe z.event.WebApp.ANALYTICS.EVENT, @track_event

  updated_send_data: (send_data) =>
    if send_data
      @_enable_error_reporting()
      if not @_localytics_disabled()
        @start_session()
        amplify.subscribe z.event.WebApp.ANALYTICS.EVENT, @track_event
        amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.TRACKING.OPT_IN
    else
      if not @_localytics_disabled()
        amplify.unsubscribeAll z.event.WebApp.ANALYTICS.EVENT
        amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.TRACKING.OPT_OUT
        @_set_empty_session_data()
        @_disable_localytics()
      @_disable_error_reporting()

  # @return [Boolean] true when "improve_wire" is set to "true".
  _has_permission: ->
    return false if @properties is undefined
    return false if @tracking_id is undefined
    return @properties.settings.privacy.improve_wire

  _subscribe_to_events: ->
    amplify.subscribe z.event.WebApp.ANALYTICS.SESSION.START, @start_session
    amplify.subscribe z.event.WebApp.ANALYTICS.SESSION.CLOSE, @close_session
    amplify.subscribe z.event.WebApp.PROPERTIES.UPDATE.SEND_DATA, @updated_send_data


  ###############################################################################
  # Localytics
  ###############################################################################

  close_session: =>
    return if @localytics is undefined or not @_has_permission()
    @logger.info 'Closing Localytics session'

    session_ended = Date.now()
    session_duration = session_ended - @session_started
    @session_values['sessionDuration'] = session_duration / 1000

    @localytics 'upload'
    @localytics 'close'
    @_set_empty_session_data()

  start_session: =>
    return if not @_has_permission() or @session_interval

    if not @localytics
      @_init_localytics window, document, 'script', @localytics
      @localytics 'setCustomerId', @tracking_id

    @_start_session()
    @session_interval = window.setInterval @tag_and_upload_session, LOCALYTICS.TRACKING_INTERVAL

  # @note We need a fat arrow here, because this function is executed from "window.setInterval"
  #
  tag_and_upload_session: =>
    return if not @_has_permission()

    number_of_connections = @user_repository.get_number_of_connections()

    @session_values[z.tracking.SessionEventName.INTEGER.TOTAL_CONTACTS] = @user_repository.connections().length
    @session_values[z.tracking.SessionEventName.INTEGER.TOTAL_GROUP_CONVERSATIONS] = @conversation_repository.get_number_of_group_conversations()
    @session_values[z.tracking.SessionEventName.INTEGER.TOTAL_INCOMING_CONNECTION_REQUESTS] = number_of_connections.incoming
    @session_values[z.tracking.SessionEventName.INTEGER.TOTAL_OUTGOING_CONNECTION_REQUESTS] = number_of_connections.outgoing
    @session_values[z.tracking.SessionEventName.INTEGER.TOTAL_ARCHIVED_CONVERSATIONS] = @conversation_repository.conversations_archived().length
    @session_values[z.tracking.SessionEventName.INTEGER.TOTAL_SILENCED_CONVERSATIONS] = @conversation_repository.get_number_of_silenced_conversations()

    # Sanitize logging data
    for key of @session_values when key is 'undefined'
      delete @session_values[key]

    # Log data
    @logger.info 'Uploading session data...', @session_values
    @_tag_and_upload_event 'session', @session_values

  track_event: (event_name, attributes) =>
    @_log_event event_name, attributes
    if @session_values[event_name] isnt undefined
      if attributes is undefined
        # Increment session event value
        @session_values[event_name] += 1
      else
        if window.Number.isInteger attributes
          @session_values[event_name] += attributes
        else
          @session_values[event_name] = attributes
    else
      # Logging events which are not bound to a session
      @_tag_and_upload_event event_name, attributes

  _set_empty_session_data: ->
    window.clearInterval @session_interval if @session_interval
    @session_interval = undefined

    for index, event_name of z.tracking.SessionEventName.INTEGER
      @session_values[event_name] = 0

    for index, event_name of z.tracking.SessionEventName.BOOLEAN
      @session_values[event_name] = false

  _disable_localytics: ->
    @localytics 'close'
    window.ll = undefined
    @localytics = undefined
    @logger.debug 'Localytics reporting was disabled due to user preferences'

  # @see http://docs.localytics.com/#Dev/Integrate/web-options.html
  _init_localytics: (window, document, node_type, @localytics, c, script_node) ->
    _get_plaform = ->
      if z.util.Environment.electron
        return 'win' if z.util.Environment.os.win
        return 'mac' if z.util.Environment.os.mac
        return 'linux'
      return 'web'

    options =
      appVersion: z.util.Environment.version()
      customDimensions: [_get_plaform()]
      sessionTimeout: z.tracking.config.SESSION_TIMEOUT / 1000

    @localytics = ->
      (@localytics.q ?= []).push arguments
      @localytics.t = new Date()
    window.ll = @localytics
    window['LocalyticsGlobal'] = 'll'
    script_node = document.createElement node_type
    script_node.src = 'https://web.localytics.com/v3/localytics.min.js'
    (c = document.getElementsByTagName(node_type)[0]).parentNode.insertBefore script_node, c

    @localytics 'init', LOCALYTICS.APP_KEY, options
    @logger.debug 'Localytics reporting is enabled'

  _localytics_disabled: ->
    if not z.util.get_url_parameter z.auth.URLParameter.LOCALYTICS
      for domain in LOCALYTICS.DISABLED_DOMAINS when z.util.StringUtil.includes window.location.hostname, domain
        @logger.debug 'Localytics reporting is disabled due to domain'
        return true
    return false

  _log_event: (event_name, attributes) ->
    if attributes
      @logger.info "Localytics event '#{event_name}' with attributes: #{JSON.stringify(attributes)}"
    else
      @logger.info "Localytics event '#{event_name}' without attributes"

  _start_session: =>
    return if not @localytics

    @logger.info 'Starting new Localytics session'
    @localytics 'open'
    @localytics 'upload'

  _tag_and_upload_event: (event_name, attributes) =>
    return if not @localytics

    @localytics 'tagEvent', event_name, attributes
    @localytics 'upload'


  ###############################################################################
  # Raygun
  ###############################################################################

  # Attach to rejected Promises.
  _attach_promise_rejection_handler: ->
    window.onunhandledrejection = (event) =>
      return if not window.onerror

      error = event.reason
      if _.isString error
        window.onerror.call @, error, null, null, null
      else if error?.message
        window.onerror.call @, error.message, error.fileName, error.lineNumber, error.columnNumber, error

      rejected_promise = event.promise
      if rejected_promise
        window.setTimeout =>
          rejected_promise.catch (error) => @logger.log @logger.levels.OFF, 'Handled uncaught Promise in error reporting', error
        , 0

  ###
  Checks if a Raygun payload has been already reported.

  @see https://github.com/MindscapeHQ/raygun4js#onbeforesend
  @param [JSON] raygun_payload
  @return [JSON|Boolean] Returns the original payload if it is an unreported error, otherwise "false".
  ###
  _check_error_payload: (raygun_payload) =>
    error_hash = objectHash.sha1 raygun_payload.Details.Error
    if @reported_errors().includes error_hash
      return false
    else
      @reported_errors.push error_hash
    return raygun_payload

  _detach_promise_rejection_handler: ->
    window.onunhandledrejection = undefined

  _disable_error_reporting: ->
    @logger.debug 'Disabling Raygun error reporting'
    Raygun.detach()
    Raygun.init RAYGUN.API_KEY, {disableErrorTracking: true}
    @_detach_promise_rejection_handler()

  _enable_error_reporting: ->
    @logger.debug 'Enabling Raygun error reporting'
    options =
      disableErrorTracking: false
      ignoreAjaxAbort: true
      ignoreAjaxError: true
      excludedHostnames: [
        'localhost'
        'wire.ms'
      ]
      ignore3rdPartyErrors: true

    options.debugMode = not z.util.Environment.frontend.is_production()

    Raygun.init(RAYGUN.API_KEY, options).attach()
    ###
    Adding a version to the Raygun reports to identify which version of the Wire ran into the issue.

    @note We cannot use our own version string as it has to be in a certain format
    @see https://github.com/MindscapeHQ/raygun4js#version-filtering
    ###
    Raygun.setUser @tracking_id
    Raygun.setVersion z.util.Environment.version false if not z.util.Environment.frontend.is_localhost()
    Raygun.withCustomData {electron_version: z.util.Environment.version true} if z.util.Environment.electron
    Raygun.onBeforeSend @_check_error_payload
    @_attach_promise_rejection_handler()
