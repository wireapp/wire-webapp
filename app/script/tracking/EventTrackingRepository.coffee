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
  LOCALYTICS.APP_KEY = 'b929419faf17d843c16649c-f5cc4c44-ccb3-11e4-2efd-004a77f8b47f'
  if z.util.Environment.electron
    if z.util.Environment.os.mac
      LOCALYTICS.APP_KEY = 'ad0b57c3c46d92daea395e0-146bc33e-6100-11e5-09e1-00deb82fd81f'
    else if z.util.Environment.os.win
      LOCALYTICS.APP_KEY = 'dfb424ad373e18163f25bc6-aa01a13c-6100-11e5-fb56-008b20abc1fa'

###
Tracker for user actions which uses Localytics as a reference implementation but can be easily used with other services.

@see https://support.localytics.com/Javascript
@see http://docs.localytics.com/#Dev/Instrument/js-tag-events.html
###
class z.tracking.EventTrackingRepository
  constructor: (@user_repository, @conversation_repository) ->
    @logger = new z.util.Logger 'z.tracking.EventTrackingRepository', z.config.LOGGER.OPTIONS

    @localytics = undefined # Localytics
    @interval = undefined # Interval to track the Localytics session
    @tracking_id = undefined # Tracking ID of the self user
    @user_properties = undefined # Reference to the current user properties / settings

    @reported_errors = ko.observableArray()
    @reported_errors.subscribe => @reported_errors [] if @reported_errors().length > 999
    @session_values = {}

    if @user_repository is undefined and @conversation_repository is undefined
      @_start_session_without_user_tracking()
      @_enable_error_reporting()
    else
      @session_started = Date.now()
      @_reset_session_values()

    @_subscribe()

  _subscribe: ->
    amplify.subscribe z.event.WebApp.ANALYTICS.INIT, @init

  ###
  @param user_properties [z.user.UserProperties]
  @param user_et [z.entity.User]
  ###
  init: (user_properties, user_et) =>
    @logger.log @logger.levels.INFO, 'Initialize tracking and error reporting'
    @user_properties = user_properties
    @tracking_id = user_et.tracking_id
    @_start_session()
    @_enable_error_reporting() if @_has_permission()
    @_subscribe_to_events()

  ###
  @see http://docs.localytics.com/#Dev/Integrate/web-options.html
  ###
  _init_localytics: (window, document, node_type, @localytics, c, script_node) =>
    options =
      appVersion: z.util.Environment.version()
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
    @logger.log @logger.levels.INFO, 'Localytics reporting is enabled'

  _localytics_disabled: ->
    if not z.util.get_url_parameter z.auth.URLParameter.LOCALYTICS
      for domain in LOCALYTICS.DISABLED_DOMAINS when z.util.contains window.location.hostname, domain
        @logger.log @logger.levels.WARN, 'Localytics reporting is disabled'
        return true
    return false

  _subscribe_to_events: ->
    amplify.subscribe z.event.WebApp.ANALYTICS.EVENT, @_track_event
    amplify.subscribe z.event.WebApp.ANALYTICS.SESSION.START, @_start_session
    amplify.subscribe z.event.WebApp.ANALYTICS.SESSION.CLOSE, @_close_session
    amplify.subscribe z.event.WebApp.PROPERTIES.UPDATE.SEND_DATA, @_send_data

  _start_session_without_user_tracking: =>
    if @_localytics_disabled()
      amplify.subscribe z.event.WebApp.ANALYTICS.EVENT, @_log_event
      return
    @_init_localytics window, document, 'script', @localytics
    @localytics 'open'
    @localytics 'upload'
    amplify.subscribe z.event.WebApp.ANALYTICS.EVENT, @_track_event

  _start_session: =>
    return if @_localytics_disabled()
    if @localytics is undefined and @_has_permission()
      @_init_localytics window, document, 'script', @localytics
      @logger.log @logger.levels.INFO, 'Starting new Localytics session'
      @localytics 'setCustomerId', @tracking_id
      @localytics 'open'
      @localytics 'upload'
      @interval = window.setInterval @_tag_and_upload_session, LOCALYTICS.TRACKING_INTERVAL

  ###
  @return [Boolean] true when "improve_wire" is set to "true".
  ###
  _has_permission: ->
    return false if @user_properties is undefined
    return false if @tracking_id is undefined
    return @user_properties.settings.privacy.improve_wire

  _log_event: (event_name, attributes) =>
    if attributes
      @logger.log "Localytics event '#{event_name}' with attributes: #{JSON.stringify(attributes)}"
    else
      @logger.log "Localytics event '#{event_name}' without attributes"

  _track_event: (event_name, attributes) =>
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

  _send_data: (send_data) =>
    if send_data is false
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.TRACKING.OPT_OUT
      @_close_session()
      @_disable_error_reporting()
    else if @session is undefined
      @_enable_error_reporting()
      @_start_session()
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.TRACKING.OPT_IN

  # @note We need a fat arrow here, because this function is executed from "window.setInterval"
  #
  _tag_and_upload_session: =>
    if @_has_permission()
      number_of_connections = @user_repository.get_number_of_connections()

      @session_values[z.tracking.SessionEventName.INTEGER.TOTAL_CONTACTS] = @user_repository.connections().length
      @session_values[z.tracking.SessionEventName.INTEGER.TOTAL_GROUP_CONVERSATIONS] = @conversation_repository.get_number_of_group_conversations()
      @session_values[z.tracking.SessionEventName.INTEGER.TOTAL_INCOMING_CONNECTION_REQUESTS] = number_of_connections.incoming
      @session_values[z.tracking.SessionEventName.INTEGER.TOTAL_OUTGOING_CONNECTION_REQUESTS] = number_of_connections.outgoing
      @session_values[z.tracking.SessionEventName.INTEGER.TOTAL_ARCHIVED_CONVERSATIONS] = @conversation_repository.conversations_archived().length
      @session_values[z.tracking.SessionEventName.INTEGER.TOTAL_SILENCED_CONVERSATIONS] = @conversation_repository.get_number_of_silenced_conversations()

      # Sanitize logging data
      for key of @session_values
        if key is 'undefined'
          delete @session_values[key]

      # Log data
      @logger.log @logger.levels.INFO, 'Uploading data...', @session_values
      @_tag_and_upload_event 'session', @session_values

  _tag_and_upload_event: (event_name, attributes) =>
    return if @localytics is undefined

    @localytics 'tagEvent', event_name, attributes
    @localytics 'upload'

  _close_session: =>
    return if @localytics is undefined
    @logger.log @logger.levels.INFO, 'Closing Localytics session'
    window.clearInterval @interval

    session_ended = Date.now()
    session_duration = session_ended - @session_started
    @session_values['sessionDuration'] = session_duration / 1000

    @localytics 'upload'
    @localytics 'close'
    window.ll = undefined
    @localytics = undefined
    @_reset_session_values()

  _disable_error_reporting: ->
    @logger.log @logger.levels.INFO, 'Disabling Raygun error reporting'
    Raygun.detach()
    @_detach_promise_rejection_handler()

  _enable_error_reporting: ->
    @logger.log @logger.levels.INFO, 'Enabling Raygun error reporting'
    options =
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

  # Attach to rejected Promises.
  _attach_promise_rejection_handler: ->
    window.onunhandledrejection = (event) =>
      return if not window.onerror

      error = event.reason
      if _.isObject error
        window.onerror.call @, error.message, error.fileName, error.lineNumber, error.columnNumber, error
      else
        window.onerror.call @, error, undefined, undefined, undefined, error

      promise = event.promise
      if promise
        promise.catch => @logger.log @logger.levels.OFF, 'Handled uncaught Promise in error reporting'

  _detach_promise_rejection_handler: ->
    window.onunhandledrejection = undefined

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

  _reset_session_values: =>
    for index, event_name of z.tracking.SessionEventName.INTEGER
      @session_values[event_name] = 0

    for index, event_name of z.tracking.SessionEventName.BOOLEAN
      @session_values[event_name] = false

  print_session_values: ->
    for key, value of @session_values
      @logger.force_log "¬ #{key}: #{value}"
    return undefined
