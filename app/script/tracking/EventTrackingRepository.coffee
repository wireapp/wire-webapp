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

LOCALYTICS =
  APP_KEY: '905792736c9f17c3464fd4e-60d90c82-d14a-11e4-af66-009c5fda0a25'
  SESSION_INTERVAL: 60000 # milliseconds
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
    @session_interval = undefined

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
      @_init_localytics() if not @localytics
      @set_custom_dimension z.tracking.CustomDimension.CONTACTS, @user_repository.connected_users().length
      @_subscribe_to_events()

    amplify.subscribe z.event.WebApp.PROPERTIES.UPDATE.SEND_DATA, @updated_send_data

  init_without_user_tracking: =>
    @_enable_error_reporting()

    if not @_localytics_disabled()
      @_init_localytics() if not @localytics
      @set_custom_dimension z.tracking.CustomDimension.CONTACTS, -1
      amplify.subscribe z.event.WebApp.ANALYTICS.EVENT, @tag_event

  updated_send_data: (send_data) =>
    if send_data
      @_enable_error_reporting()
      if not @_localytics_disabled()
        @start_session()
        @set_custom_dimension z.tracking.CustomDimension.CONTACTS, @user_repository.connected_users().length
        @_subscribe_to_events()
        @tag_event z.tracking.EventName.TRACKING.OPT_IN
    else
      if not @_localytics_disabled()
        amplify.unsubscribeAll z.event.WebApp.ANALYTICS.CUSTOM_DIMENSION
        amplify.unsubscribeAll z.event.WebApp.ANALYTICS.EVENT
        @tag_event z.tracking.EventName.TRACKING.OPT_OUT
        @_disable_localytics()
      @_disable_error_reporting()

  _has_permission: ->
    return false if @properties is undefined
    return @properties.settings.privacy.improve_wire

  _subscribe_to_events: ->
    amplify.subscribe z.event.WebApp.ANALYTICS.CLOSE_SESSION, @close_session
    amplify.subscribe z.event.WebApp.ANALYTICS.CUSTOM_DIMENSION, @set_custom_dimension
    amplify.subscribe z.event.WebApp.ANALYTICS.EVENT, @tag_event
    amplify.subscribe z.event.WebApp.ANALYTICS.START_SESSION, @start_session

  _unsubscribe_from_events: ->
    amplify.unsubscribeAll z.event.WebApp.ANALYTICS.CLOSE_SESSION
    amplify.unsubscribeAll z.event.WebApp.ANALYTICS.CUSTOM_DIMENSION
    amplify.unsubscribeAll z.event.WebApp.ANALYTICS.EVENT
    amplify.unsubscribeAll z.event.WebApp.ANALYTICS.START_SESSION


  ###############################################################################
  # Localytics
  ###############################################################################

  close_session: =>
    return if @localytics is undefined or not @_has_permission()
    @logger.info 'Closing Localytics session'

    @localytics 'upload'
    @localytics 'close'
    window.clearInterval @session_interval if @session_interval
    @session_interval = undefined

  set_custom_dimension: (custom_dimension, value) =>
    return if not @localytics

    @logger.info "Set Localytics custom dimension '#{custom_dimension}' to value '#{value}'"
    @localytics 'setCustomDimension', custom_dimension, value

  start_session: =>
    return if not @_has_permission() or @session_interval

    @_init_localytics() if not @localytics

    @logger.info 'Starting new Localytics session'
    @localytics 'open'
    @localytics 'upload'
    @session_interval = window.setInterval @upload_session, LOCALYTICS.SESSION_INTERVAL

  tag_event: (event_name, attributes) =>
    return if not @localytics

    if attributes
      @logger.info "Localytics event '#{event_name}' with attributes: #{JSON.stringify(attributes)}"
    else
      @logger.info "Localytics event '#{event_name}' without attributes"

    @localytics 'tagEvent', event_name, attributes

  upload_session: =>
    return if not @localytics
    @localytics 'upload'

  _disable_localytics: ->
    @localytics 'close'
    window.ll = undefined
    @localytics = undefined
    @logger.debug 'Localytics reporting was disabled due to user preferences'

  # @see http://docs.localytics.com/#Dev/Integrate/web-options.html
  _init_localytics: ->
    _get_plaform = ->
      if z.util.Environment.electron
        return 'win' if z.util.Environment.os.win
        return 'mac' if z.util.Environment.os.mac
        return 'linux'
      return 'web'

    options =
      appVersion: z.util.Environment.version()
      customDimensions: [_get_plaform()]

    @localytics = ->
      (@localytics.q ?= []).push arguments
      @localytics.t = new Date()

    window.ll = @localytics
    window.LocalyticsGlobal = 'll'

    script_element = document.createElement 'script'
    script_element.src = 'https://web.localytics.com/v3/localytics.min.js'

    (element_node = document.getElementsByTagName('script')[0]).parentNode.insertBefore script_element, element_node

    @localytics 'init', LOCALYTICS.APP_KEY, options
    @logger.debug 'Localytics reporting is enabled'

  _localytics_disabled: ->
    if not z.util.get_url_parameter z.auth.URLParameter.LOCALYTICS
      for domain in LOCALYTICS.DISABLED_DOMAINS when z.util.StringUtil.includes window.location.hostname, domain
        @logger.debug 'Localytics reporting is disabled due to domain'
        return true
    return false


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
    @_attach_promise_rejection_handler()
