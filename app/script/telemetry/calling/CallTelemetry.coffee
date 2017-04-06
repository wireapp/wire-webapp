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
  constructor: (protocol_version) ->
    @logger = new z.util.Logger 'z.telemetry.calling.CallTelemetry', z.config.LOGGER.OPTIONS

    @sessions = {}
    @protocol_version = if protocol_version is z.calling.enum.PROTOCOL.VERSION_2 then 'C2' else 'C3'
    @remote_version = undefined

    @media_type = z.media.MediaType.AUDIO

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
    @sessions[event.session] = new z.calling.v2.CallTrackingInfo {
      conversation_id: conversation_id
      session_id: event.session
    }


  ###############################################################################
  # Error reporting
  ###############################################################################

  ###
  Report an error to Raygun.
  @param description [String] Error description
  @param passed_error [Object] Error to be attached to the report
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

  set_media_type: (video_send = false) =>
    @media_type = if video_send then z.media.MediaType.VIDEO else z.media.MediaType.AUDIO
    @logger.info "Set media type to '#{@media_type}'"

  ###
  Stores the remove version of call.
  @param remote_version [String] Remove version string
  ###
  set_remote_version: (remote_version) =>
    unless @remote_version is remote_version
      @remote_version = remote_version
      @logger.info "Identified remote call version as '#{remote_version}'"

  ###
  Reports call events for call tracking to Localytics.
  @param event_name [z.tracking.EventName] String for call event
  @param call_et [z.calling.Call] Call entity
  @param attributes [Object] Attributes for the event
  ###
  track_event: (event_name, call_et, attributes = {}) ->
    if call_et
      attributes = $.extend
        conversation_participants: call_et.conversation_et.number_of_participants()
        conversation_participants_in_call: call_et.max_number_of_participants
        conversation_type: if call_et.is_group() then z.tracking.attribute.ConversationType.GROUP else z.tracking.attribute.ConversationType.ONE_TO_ONE
        remote_version: @remote_version if event_name in [z.tracking.EventName.CALLING.ESTABLISHED_CALL, z.tracking.EventName.CALLING.JOINED_CALL]
        version: @protocol_version
        with_bot: call_et.conversation_et.is_with_bot()
      , attributes

      if @media_type is z.media.MediaType.VIDEO
        event_name = event_name.replace '_call', '_video_call'

    amplify.publish z.event.WebApp.ANALYTICS.EVENT, event_name, attributes

  ###
  Track the call duration.
  @param call_et [z.calling.Call] Call entity
  ###
  track_duration: (call_et) =>
    duration = Math.floor (Date.now() - call_et.timer_start) / 1000
    if not window.isNaN duration
      @logger.info "Call duration: #{duration} seconds.", call_et.duration_time()

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
        reason: call_et.termination_reason
        remote_version: @remote_version
        version: @protocol_version
        with_bot: call_et.conversation_et.is_with_bot()

      event_name = z.tracking.EventName.CALLING.ENDED_CALL
      if @media_type is z.media.MediaType.VIDEO
        event_name = event_name.replace '_call', '_video_call'

      amplify.publish z.event.WebApp.ANALYTICS.EVENT, event_name, attributes
