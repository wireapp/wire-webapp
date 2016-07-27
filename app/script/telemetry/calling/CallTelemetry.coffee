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
z.telemetry ?= {}
z.telemetry.calling ?= {}

# Call traces entity.
class z.telemetry.calling.CallTelemetry
  constructor: ->
    @logger = new z.util.Logger 'z.telemetry.calling.CallTelemetry', z.config.LOGGER.OPTIONS

    @sessions = {}
    @requests = {}
    @traces = {}


  ###############################################################################
  # Call traces
  ###############################################################################

  ###
  Add an event to the call trace.
  @param event [JSON] Backend event
  ###
  trace_event: (event) =>
    @traces[event.conversation] ?= []

    timing_incoming = Date.now()

    @traces[event.conversation].push {
      from: 'backend'
      to: 'us'
      transport: 'WebSocket'
      response:
        payload: event
        timestamp: timing_incoming
        timestamp_iso_8601: new Date(timing_incoming).toISOString()
    }

  ###
  Add a backend response to the debug trace.
  @param conversation_id [String] Conversation ID of call
  @param jqXHR [jQuery XMLHttpRequest] jQuery object of backend response
  ###
  trace_request: (conversation_id, jqXHR) ->
    timestamp_incoming = jqXHR.wire.responded.getTime()
    timestamp_outgoing = jqXHR.wire.requested.getTime()

    request_duration = timestamp_incoming - timestamp_outgoing
    request_type = "#{jqXHR.wire.original_request_options.type} #{jqXHR.wire.original_request_options.api_endpoint}"
    @requests[request_type] ?= []
    @requests[request_type].push request_duration
    hits = @requests[request_type].length
    average = z.util.Statistics.average @requests[request_type]
    standard_deviation = z.util.Statistics.standard_deviation @requests[request_type], average
    @logger.log @logger.levels.INFO, "Request #{request_type} took #{request_duration}ms"
    @logger.log @logger.levels.INFO, "# of requests #{hits} - Avg: #{average}ms | SD: #{standard_deviation}"

    trace_payload = {}
    if jqXHR.wire.original_request_options.data
      trace_payload = JSON.parse z.util.types.convert_array_buffer_to_string jqXHR.wire.original_request_options.data

    @traces[conversation_id] ?= []
    @traces[conversation_id].push {
      from: 'us'
      to: 'backend'
      transport: 'REST'
      request:
        method: jqXHR.wire.original_request_options.type
        url: jqXHR.wire.original_request_options.url
        payload: trace_payload
        timestamp: timestamp_outgoing
        timestamp_iso_8601: new Date(timestamp_outgoing).toISOString()
      response:
        status:
          code: jqXHR.status
          text: jqXHR.statusText
        payload: jqXHR.responseJSON
        timestamp: timestamp_incoming
        timestamp_iso_8601: new Date(timestamp_incoming).toISOString()
    }


  ###############################################################################
  # Sessions
  ###############################################################################

  # Force log last call session IDs.
  log_sessions: =>
    @logger.force_log 'Your last session IDs:'
    sorted_sessions = z.util.sort_object_by_keys @sessions, true
    @logger.force_log tracking_info.to_string() for session_id, tracking_info of sorted_sessions
    return sorted_sessions

  ###
  Track session ID.
  @param conversation_id [String] ID of conversation for call session
  @param event [JSON] Call event from backend
  ###
  track_session: (conversation_id, event) =>
    @sessions[event.session] = new z.calling.CallTrackingInfo {
      conversation_id: conversation_id
      session_id: event.session
    }


  ###############################################################################
  # Error reporting
  ###############################################################################

  ###
  Report an error to Raygun.
  @param description [String] Error description
  @param custom_date [Object] Custom data passed into the report
  ###
  report_error: (description, passed_error) ->
    raygun_error = new Error description

    if passed_error
      custom_data =
        error: passed_error
      raygun_error.stack = passed_error.stack

    Raygun.send raygun_error, custom_data


  ###############################################################################
  # Analytics
  ###############################################################################

  ###
  Reports call events for call tracking to Localytics.
  @param event_name [z.tracking.EventName] String for call event
  @param call_et [z.calling.Call] Call entity
  @param attributes [Object] Attributes for the event
  ###
  track_event: (event_name, call_et, attributes) ->
    if call_et
      attributes =
        conversation_participants: call_et.conversation_et.number_of_participants()
        conversation_participants_in_call: call_et.max_number_of_participants
        conversation_type: if call_et.is_group() then z.tracking.attribute.ConversationType.GROUP else z.tracking.attribute.ConversationType.ONE_TO_ONE

      if call_et.is_remote_videod()
        event_name = event_name.replace '_call', '_video_call'

    amplify.publish z.event.WebApp.ANALYTICS.EVENT, event_name, attributes

  # Track the call duration.
  track_duration: (call_et) =>
    duration = Math.floor (Date.now() - call_et.timer_start) / 1000
    if not window.isNaN duration
      @logger.log @logger.levels.INFO, "Call duration: #{duration} seconds.", call_et.duration_time()

      if duration <= 15
        duration_bucket = '0s-15s'
      else if duration <= 30
        duration_bucket = '16s-30s'
      else if duration <= 60
        duration_bucket = '31s-60s'
      else if duration <= 3 * 60
        duration_bucket = '61s-3min'
      else if duration <= 10 * 60
        duration_bucket = '3min-10min'
      else if duration <= 60 * 60
        duration_bucket = '10min-1h'
      else
        duration_bucket = '1h-infinite'

      attributes =
        conversation_participants: call_et.conversation_et.number_of_participants()
        conversation_participants_in_call: call_et.max_number_of_participants
        conversation_type: if call_et.is_group() then z.tracking.attribute.ConversationType.GROUP else z.tracking.attribute.ConversationType.ONE_TO_ONE
        duration: duration_bucket
        duration_sec: duration
        reason: call_et.finished_reason

      event_name = z.tracking.EventName.CALLING.ENDED_CALL
      if call_et.is_remote_videod()
        event_name = event_name.replace '_call', '_video_call'

      amplify.publish z.event.WebApp.ANALYTICS.EVENT, event_name, attributes
