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
z.event ?= {}

RECONNECT_INTERVAL = 15000

PING_INTERVAL = 30000
PING_INTERVAL_THRESHOLD = 2000

# WebSocket Service to manage the WebSocket connection to the backend.
class z.event.WebSocketService
  @::CHANGE_TRIGGER =
    CLEANUP: 'z.event.WebSocketService::CHANGE_TRIGGER.CLEANUP'
    CLOSE: 'z.event.WebSocketService::CHANGE_TRIGGER.CLOSE'
    ERROR: 'z.event.WebSocketService::CHANGE_TRIGGER.ERROR'
    LOGOUT: 'z.event.WebSocketService::CHANGE_TRIGGER.LOGOUT'
    OFFLINE: 'z.event.WebSocketService::CHANGE_TRIGGER.OFFLINE'
    ONLINE: 'z.event.WebSocketService::CHANGE_TRIGGER.ONLINE'
    PAGE_NAVIGATION: 'z.event.WebSocketService::CHANGE_TRIGGER.PAGE_NAVIGATION'
    PING_INTERVAL: 'z.event.WebSocketService::CHANGE_TRIGGER.PING_INTERVAL'
    READY_STATE: 'z.event.WebSocketService::CHANGE_TRIGGER.READY_STATE'
    WARNING_BAR: 'z.event.WebSocketService::CHANGE_TRIGGER.WARNING_BAR'


  ###
  Construct a new WebSocket Service.
  @param client [z.service.Client] Client for the API calls
  ###
  constructor: (@client) ->
    @logger = new z.util.Logger 'z.event.WebSocketService', z.config.LOGGER.OPTIONS

    @client_id = undefined
    @connection_url = ''
    @socket = undefined

    @on_notification = undefined

    @ping_interval_id = undefined
    @last_ping_time = undefined

    @reconnect_timeout_id = undefined
    @reconnect_count = 0

  ###
  Establish the WebSocket connection.
  @param on_notification [Function] Function to be called on incoming notifications
  @return [Promise] Promise that resolves once the WebSocket connects
  ###
  connect: (on_notification) =>
    return new Promise (resolve, reject) =>
      @on_notification = on_notification
      @connection_url = "#{@client.web_socket_url}/await?access_token=#{@client.access_token}"
      @connection_url = z.util.append_url_parameter @connection_url, "client=#{@client_id}" if @client_id

      @reset z.event.WebSocketService::CHANGE_TRIGGER.CLEANUP if typeof @socket is 'object'

      @socket = new WebSocket @connection_url
      @socket.binaryType = 'blob'

      # http://stackoverflow.com/a/27828483/451634
      delete @socket.URL

      @socket.onopen = =>
        @logger.log @logger.levels.INFO, "Connected WebSocket to: #{@client.web_socket_url}/await"
        @ping_interval_id = window.setInterval @send_ping, PING_INTERVAL
        resolve()

      @socket.onerror = (event) =>
        @logger.log @logger.levels.ERROR, 'WebSocket connection error.', event
        @reset z.event.WebSocketService::CHANGE_TRIGGER.ERROR, true

      @socket.onclose = (event) =>
        @logger.log @logger.levels.WARN, 'Closed WebSocket connection', event
        @reset z.event.WebSocketService::CHANGE_TRIGGER.CLOSE, true

      @socket.onmessage = (event) ->
        if event.data instanceof Blob
          blob_reader = new FileReader()
          blob_reader.onload = -> on_notification JSON.parse blob_reader.result
          blob_reader.readAsText event.data

  ###
  Reconnect WebSocket after access token has been refreshed.
  @param trigger [z.event.WebSocketService::CHANGE_TRIGGER] Trigger of the reconnect
  ###
  pending_reconnect: (trigger) =>
    amplify.unsubscribeAll z.event.WebApp.CONNECTION.ACCESS_TOKEN.RENEWED
    @logger.log @logger.levels.INFO, "Executing pending WebSocket reconnect triggered by '#{trigger}' after access token refresh"
    @reconnect trigger

  ###
  Try to re-establish the WebSocket connection.
  @param trigger [z.event.WebSocketService::CHANGE_TRIGGER] Trigger of the reconnect
  ###
  reconnect: (trigger) =>
    if not z.util.StorageUtil.get_value z.storage.StorageKey.AUTH.ACCESS_TOKEN.EXPIRATION
      @logger.log @logger.levels.INFO, "Access token has to be refreshed before reconnecting the WebSocket triggered by '#{trigger}'"
      amplify.unsubscribeAll z.event.WebApp.CONNECTION.ACCESS_TOKEN.RENEWED
      amplify.subscribe z.event.WebApp.CONNECTION.ACCESS_TOKEN.RENEWED, => @pending_reconnect trigger
      return amplify.publish z.event.WebApp.CONNECTION.ACCESS_TOKEN.RENEW, 'Attempted WebSocket reconnect'

    @reconnect_count++
    reconnect = =>
      @logger.log @logger.levels.INFO, "Trying to re-establish WebSocket connection. Try ##{@reconnect_count}"
      @connect @on_notification
      .then =>
        @reconnect_count = 0
        @logger.log @logger.levels.INFO, "Reconnect to WebSocket triggered by '#{trigger}'"
        @on_socket_reconnected()

    if @reconnect_count is 1
      reconnect()
    else
      @reconnect_timeout_id = window.setTimeout ->
        reconnect()
      , RECONNECT_INTERVAL

  ###
  Reset the WebSocket connection.
  @param trigger [z.event.WebSocketService::CHANGE_TRIGGER] Trigger of the reset
  @param reconnect [Boolean] Re-establish the WebSocket connection
  ###
  reset: (trigger, reconnect = false) =>
    if @socket?.onclose
      @logger.log @logger.levels.INFO, "WebSocket reset triggered by '#{trigger}'"
      @socket.onerror = undefined
      @socket.onclose = undefined
      @socket.close()
      window.clearInterval @ping_interval_id
      window.clearTimeout @reconnect_timeout_id
    if reconnect
      amplify.publish z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.CONNECTIVITY_RECONNECT
      @reconnect trigger

  # Send a WebSocket ping.
  send_ping: =>
    if @socket.readyState is 1
      current_time = Date.now()
      @last_ping_time ?= current_time
      ping_interval_diff = @last_ping_time - current_time

      if ping_interval_diff > PING_INTERVAL + PING_INTERVAL_THRESHOLD
        @logger.log @logger.levels.WARN, 'Ping interval check failed'
        @reconnect z.event.WebSocketService::CHANGE_TRIGGER.PING_INTERVAL
      else
        @logger.log @logger.levels.INFO, 'Sending ping to WebSocket'
        @socket.send 'Wire is so much nicer with internet!'
    else
      @logger.log @logger.levels.WARN, "WebSocket connection is closed. Current ready state: #{@socket.readyState}"
      @reconnect z.event.WebSocketService::CHANGE_TRIGGER.READY_STATE

  ###
  Behavior when WebSocket connection is re-established after a connection drop.
  @param trigger [z.event.WebSocketService::CHANGE_TRIGGER] Trigger of the reconnect
  ###
  on_socket_reconnected: =>
    amplify.publish z.event.WebApp.WARNING.DISMISS, z.ViewModel.WarningType.CONNECTIVITY_RECONNECT
    @logger.log @logger.levels.WARN, 'Re-established WebSocket connection. Recovering from Notification Stream...'
    amplify.publish z.event.WebApp.CONNECTION.ONLINE

  ###
  Behavior when WebSocket connection is closed.
  @param trigger [z.event.WebSocketService::CHANGE_TRIGGER] Trigger of the connection close
  ###
  on_socket_closed: (trigger) ->
    amplify.publish z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.CONNECTIVITY_RECONNECT
    error = new Error "WebSocket connection lost: #{trigger}"
    custom_data =
      network_status: navigator.onLine
    Raygun.send error, custom_data
