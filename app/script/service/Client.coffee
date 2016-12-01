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
z.service ?= {}

IGNORED_BACKEND_ERRORS = [
  z.service.BackendClientError::STATUS_CODE.BAD_GATEWAY
  z.service.BackendClientError::STATUS_CODE.BAD_REQUEST
  z.service.BackendClientError::STATUS_CODE.CONFLICT
  z.service.BackendClientError::STATUS_CODE.CONNECTIVITY_PROBLEM
  z.service.BackendClientError::STATUS_CODE.INTERNAL_SERVER_ERROR
  z.service.BackendClientError::STATUS_CODE.NOT_FOUND
  z.service.BackendClientError::STATUS_CODE.PRECONDITION_FAILED
  z.service.BackendClientError::STATUS_CODE.REQUEST_TIMEOUT
  z.service.BackendClientError::STATUS_CODE.REQUEST_TOO_LARGE
  z.service.BackendClientError::STATUS_CODE.TOO_MANY_REQUESTS
]

# Client for all backend REST API calls.
class z.service.Client
  ###
  Construct a new client.

  @param settings [Object] Settings for different backend environments
  @option settings [String] environment
  @option settings [String] rest_url
  @option settings [String] web_socket_url
  @option settings [String] parameter
  ###
  constructor: (settings) ->
    @logger = new z.util.Logger 'z.service.Client', z.config.LOGGER.OPTIONS

    z.util.Environment.backend.current = settings.environment
    @rest_url = settings.rest_url
    @web_socket_url = settings.web_socket_url

    @request_queue = []
    @request_queue_blocked_state = ko.observable z.service.RequestQueueBlockedState.NONE

    @access_token = ''
    @access_token_type = ''

    @number_of_requests = ko.observable 0
    @number_of_requests.subscribe (new_value) ->
      amplify.publish z.event.WebApp.TELEMETRY.BACKEND_REQUESTS, new_value

    # http://stackoverflow.com/a/18996758/451634
    pre_filters = $.Callbacks()
    pre_filters.before_each_request = (options, originalOptions, jqXHR) =>
      jqXHR.wire =
        original_request_options: originalOptions
        request_id: @number_of_requests()
        requested: new Date()

    $.ajaxPrefilter pre_filters.before_each_request

  ###
  Create a request URL.
  @param url [String] API endpoint to be prefixed with REST API environment
  @return [String] REST API endpoint
  ###
  create_url: (url) ->
    return "#{@rest_url}#{url}"

  ###
  Request backend status.
  @return [$.Promise] jquery AJAX promise
  ###
  status: =>
    $.ajax
      type: 'HEAD'
      timeout: 500
      url: @create_url '/self'

  ###
  Delay a function call until backend connectivity is guaranteed.
  @return [Promise] Promise that resolves once the connectivity is verified
  ###
  execute_on_connectivity: =>
    return new Promise (resolve) =>

      _check_status = =>
        @status()
        .done (jqXHR) =>
          @logger.log @logger.levels.INFO, 'Connectivity verified', jqXHR
          resolve()
        .fail (jqXHR) =>
          if jqXHR.readyState is 4
            @logger.log @logger.levels.INFO, "Connectivity verified by server error '#{jqXHR.status}'", jqXHR
            resolve()
          else
            @logger.log @logger.levels.WARN, 'Connectivity could not be verified... retrying'
            window.setTimeout _check_status, 2000

      _check_status()

  # Execute queued requests.
  execute_request_queue: =>
    return if not @access_token or not @request_queue.length

    @logger.log @logger.levels.INFO, "Executing '#{@request_queue.length}' queued requests"
    for request in @request_queue
      [config, resolve_fn, reject_fn] = request
      @logger.log @logger.levels.INFO, "Queued '#{config.type}' request to '#{config.url}' executed"
      @send_request config
      .then resolve_fn
      .catch (error) =>
        @logger.log @logger.levels.INFO, "Failed to execute queued '#{config.type}' request to '#{config.url}'", error
        reject_fn error

    @request_queue.length = 0

  ###
  Send jQuery AJAX request.
  @see http://api.jquery.com/jquery.ajax/#jQuery-ajax-settings
  @param config [Object]
  @option config [Function] callback DEPRECATED: use Promises
  @option config [String] contentType
  @option config [Object] data
  @option config [Object] headers
  @option config [Boolean] processData
  @option config [Number] timeout
  @option config [String] type
  @option config [String] url
  @option config [Boolean] withCredentials
  ###
  send_request: (config) ->
    return new Promise (resolve, reject) =>
      if @request_queue_blocked_state() isnt z.service.RequestQueueBlockedState.NONE
        return @_push_to_request_queue [config, resolve, reject], @request_queue_blocked_state()

      if @access_token
        config.headers = $.extend Authorization: "#{@access_token_type} #{@access_token}", config.headers

      if config.withCredentials
        config.xhrFields = withCredentials: true

      @number_of_requests @number_of_requests() + 1

      $.ajax
        contentType: config.contentType
        data: config.data
        headers: config.headers
        processData: config.processData
        timeout: config.timeout
        type: config.type
        url: config.url
        xhrFields: config.xhrFields
      .done (data, textStatus, jqXHR) =>
        config.callback? data
        resolve data
        @logger.log @logger.levels.OFF, "Server Response '#{jqXHR.wire?.request_id}' from '#{config.url}':", data
      .fail (jqXHR, textStatus, errorThrown) =>
        switch jqXHR.status
          when z.service.BackendClientError::STATUS_CODE.CONNECTIVITY_PROBLEM
            @request_queue_blocked_state z.service.RequestQueueBlockedState.CONNECTIVITY_PROBLEM
            @_push_to_request_queue [config, resolve, reject], @request_queue_blocked_state()
            @execute_on_connectivity()
            .then =>
              @request_queue_blocked_state z.service.RequestQueueBlockedState.NONE
              @execute_request_queue()
            return
          when z.service.BackendClientError::STATUS_CODE.UNAUTHORIZED
            @_push_to_request_queue [config, resolve, reject], z.service.RequestQueueBlockedState.ACCESS_TOKEN_REFRESH
            amplify.publish z.event.WebApp.CONNECTION.ACCESS_TOKEN.RENEW, 'Unauthorized backend request'
            return
          when z.service.BackendClientError::STATUS_CODE.FORBIDDEN
            switch jqXHR.responseJSON?.label
              when z.service.BackendClientError::LABEL.INVALID_CREDENTIALS
                Raygun.send new Error 'Server request failed: Invalid credentials'
              when z.service.BackendClientError::LABEL.TOO_MANY_CLIENTS, z.service.BackendClientError::LABEL.TOO_MANY_MEMBERS
                @logger.log @logger.levels.WARN, "Server request failed: '#{jqXHR.responseJSON.label}'"
              else
                Raygun.send new Error 'Server request failed'
          else
            if jqXHR.status not in IGNORED_BACKEND_ERRORS
              Raygun.send new Error "Server request failed: #{jqXHR.status}"

        if _.isFunction config.callback
          config.callback null, jqXHR.responseJSON or new z.service.BackendClientError errorThrown
        else
          reject jqXHR.responseJSON or new z.service.BackendClientError jqXHR.status

  ###
  Send AJAX request with compressed JSON body.

  @note ContentType will be overwritten with 'application/json; charset=utf-8'
  @see send_request for valid parameters
  ###
  send_json: (config) ->
    json_config =
      contentType: 'application/json; charset=utf-8'
      data: pako.gzip JSON.stringify config.data if config.data
      headers:
        'Content-Encoding': 'gzip'
      processData: false
    @send_request $.extend config, json_config, true

  _push_to_request_queue: ([config, resolve_fn, reject_fn], reason) ->
    @logger.log @logger.levels.INFO, "Adding '#{config.type}' request to #{config.url}' to queue due to #{reason}", config
    @request_queue.push [config, resolve_fn, reject_fn]
