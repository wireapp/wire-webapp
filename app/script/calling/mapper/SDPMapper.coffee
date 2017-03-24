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
z.calling ?= {}
z.calling.mapper ?= {}

SDP_MAPPER_CONFIG =
  AUDIO_BITRATE: '30'
  AUDIO_PTIME: '60'

z.calling.mapper.SDPMapper =
  get_tool_version: (sdp_string) ->
    return sdp_line.replace 'a=tool:', '' for sdp_line in sdp_string.split '\r\n' when sdp_line.startsWith 'a=tool'

  ###
  Map e-call setup message to RTCSessionDescription.
  @param e_call_message_et [z.calling.entities.ECallMessage] E-call message entity of type z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
  @return [RTCSessionDescription] webRTC standard compliant RTCSessionDescription
  ###
  map_e_call_message_to_object: (e_call_message_et) ->
    return Promise.resolve new window.RTCSessionDescription
      sdp: e_call_message_et.sdp
      type: if e_call_message_et.response is true then z.calling.rtc.SDPType.ANSWER else z.calling.rtc.SDPType.OFFER

  map_event_to_object: (event) ->
    return new window.RTCSessionDescription sdp: event.sdp, type: event.state

  ###
  Rewrite the SDP for compatibility reasons.

  @param rtc_sdp [RTCSessionDescription] Session Description Protocol to be rewritten
  @param sdp_source [z.calling.enum.SDPSource] Source of the SDP - local or remote
  @param flow_et [z.calling.entities.EFlow|z.calling.entities.Flow] Flow entity
  @return [Array<Number, RTCSessionDescription>] Array consisting of rewritten Session Description Protocol and number of ICE candidates
  ###
  rewrite_sdp: (rtc_sdp, sdp_source = z.calling.enum.SDPSource.REMOTE, flow_et) ->
    if sdp_source is z.calling.enum.SDPSource.LOCAL
      rtc_sdp.sdp = rtc_sdp.sdp.replace 'UDP/TLS/', ''

    sdp_lines = []
    ice_candidates = []

    for sdp_line in rtc_sdp.sdp.split '\r\n'
      outline = sdp_line

      if sdp_line.startsWith 't='
        if sdp_source is z.calling.enum.SDPSource.LOCAL
          sdp_lines.push sdp_line
          browser_string = "#{z.util.Environment.browser.name} #{z.util.Environment.browser.version}"
          if z.util.Environment.electron
            outline = "a=tool:electron #{z.util.Environment.version()} #{z.util.Environment.version false} (#{browser_string})"
          else
            outline = "a=tool:webapp #{z.util.Environment.version false} (#{browser_string})"

      else if sdp_line.startsWith 'a=candidate'
        ice_candidates.push sdp_line

      # Remove once obsolete due to high uptake of clients based on AVS build 3.3.11 containing fix for AUDIO-1215
      else if sdp_line.startsWith 'a=mid'
        if sdp_source is z.calling.enum.SDPSource.REMOTE and z.util.Environment.browser.firefox and rtc_sdp.type is z.calling.rtc.SDPType.ANSWER
          outline = 'a=mid:sdparta_2' if sdp_line is 'a=mid:data'

      # Code to nail in bit-rate and ptime settings for improved performance and experience
      else if sdp_line.startsWith 'm=audio'
        if flow_et.negotiation_mode() is z.calling.enum.SDP_NEGOTIATION_MODE.ICE_RESTART or (sdp_source is z.calling.enum.SDPSource.LOCAL and flow_et.is_group())
          sdp_lines.push sdp_line
          outline = "b=AS:#{SDP_MAPPER_CONFIG.AUDIO_BITRATE}"

      else if sdp_line.startsWith 'a=rtpmap'
        if flow_et.negotiation_mode() is z.calling.enum.SDP_NEGOTIATION_MODE.ICE_RESTART or (sdp_source is z.calling.enum.SDPSource.LOCAL and flow_et.is_group())
          if z.util.StringUtil.includes sdp_line, 'opus'
            sdp_lines.push sdp_line
            outline = "a=ptime:#{SDP_MAPPER_CONFIG.AUDIO_PTIME}"

      # Workaround for incompatibility between Chrome 57 and AVS builds. Remove once update of clients with AVS 3.3.x is high enough.
      else if sdp_line.startsWith 'a=fmtp'
        outline = 'a=fmtp:125 apt=96' if sdp_line is 'a=fmtp:125 apt=100'

      sdp_lines.push outline unless outline is undefined

    rtc_sdp.sdp = sdp_lines.join '\r\n'
    return Promise.resolve [rtc_sdp, ice_candidates]
