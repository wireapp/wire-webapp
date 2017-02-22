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

    @localytics = undefined
    @properties = undefined # Reference to the properties

    @reported_errors = ko.observableArray()
    @reported_errors.subscribe => @reported_errors [] if @reported_errors().length > 999

    if @user_repository is undefined and @conversation_repository is undefined
      @init_without_user_tracking()
    else
      amplify.subscribe z.event.WebApp.ANALYTICS.INIT, @init

  ###
  @param properties [z.properties.Properties]
  ###
  init: (properties) =>
    @properties = properties
    @logger.info 'Initialize tracking and error reporting'

    if not @_localytics_disabled() and @_has_permission()
      @_enable_error_reporting()
      amplify.subscribe z.event.WebApp.ANALYTICS.EVENT, @track_event
      amplify.subscribe z.event.WebApp.ANALYTICS.DIMENSION, @_track_dimension

    @_subscribe_to_events()

  init_without_user_tracking: =>
    @_enable_error_reporting()

    if not @_localytics_disabled()
      if not @localytics
        @_init_localytics window, document, 'script', @localytics
      amplify.subscribe z.event.WebApp.ANALYTICS.EVENT, @track_event
      amplify.subscribe z.event.WebApp.ANALYTICS.DIMENSION, @_track_dimension

  updated_send_data: (send_data) =>
    if send_data
      @_enable_error_reporting()
      if not @_localytics_disabled()
        amplify.subscribe z.event.WebApp.ANALYTICS.EVENT, @track_event
        amplify.subscribe z.event.WebApp.ANALYTICS.DIMENSION, @_track_dimension
        amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.TRACKING.OPT_IN
    else
      if not @_localytics_disabled()
        amplify.unsubscribeAll z.event.WebApp.ANALYTICS.EVENT
        amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.TRACKING.OPT_OUT
        @_disable_localytics()
      @_disable_error_reporting()

  _has_permission: ->
    return false if @properties is undefined
    return @properties.settings.privacy.improve_wire

  _subscribe_to_events: ->
    amplify.subscribe z.event.WebApp.PROPERTIES.UPDATE.SEND_DATA, @updated_send_data

  track_event: (event_name, attributes) =>
    @_tag_and_upload_event event_name, attributes

  _track_dimension: (name, value) =>
    return if not @localytics

    @logger.info "Tracking Localytics dimension '#{name}' of size '#{value}'"

    @localytics 'setCustomDimension', value, name
    @localytics 'upload'

  ###############################################################################
  # Localytics
  ###############################################################################

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
    @_track_dimension z.tracking.DimensionName.CONTACTS, -1
    @logger.debug 'Localytics reporting is enabled'

  _localytics_disabled: ->
    if not z.util.get_url_parameter z.auth.URLParameter.LOCALYTICS
      for domain in LOCALYTICS.DISABLED_DOMAINS when z.util.StringUtil.includes window.location.hostname, domain
        @logger.debug 'Localytics reporting is disabled due to domain'
        return true
    return false

  _tag_and_upload_event: (event_name, attributes) =>
    return if not @localytics

    if attributes
      @logger.info "Localytics event '#{event_name}' with attributes: #{JSON.stringify(attributes)}"
    else
      @logger.info "Localytics event '#{event_name}' without attributes"

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
    Raygun.setVersion z.util.Environment.version false if not z.util.Environment.frontend.is_localhost()
    Raygun.withCustomData {electron_version: z.util.Environment.version true} if z.util.Environment.electron
    Raygun.onBeforeSend @_check_error_payload
    @_attach_promise_rejection_handler()
