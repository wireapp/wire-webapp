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

SDP_REWRITE_MAPPER_CONFIG =
  AUDIO_BITRATE: '30'
  AUDIO_PTIME: '60'

###
Rewrite the SDP for compatibility reasons.

@private
@param rtc_sdp [RTCSessionDescription] Session Description Protocol to be rewritten
@param sdp_source [z.calling.enum.SDPSource] Source of the SDP - local or remote
@param flow_et [z.calling.entities.EFlow|z.calling.entities.Flow] Flow entity
@return [Array<Number, RTCSessionDescription>] Array consisting of rewritten Session Description Protocol and number of ICE candidates
###
z.calling.mapper.SDPRewriteMapper =
  rewrite_sdp: (rtc_sdp, sdp_source = z.calling.enum.SDPSource.REMOTE, flow_et) ->
    if sdp_source is z.calling.enum.SDPSource.LOCAL
      rtc_sdp.sdp = rtc_sdp.sdp.replace 'UDP/TLS/', ''

    sdp_lines = []
    ice_candidates = []

    for sdp_line in rtc_sdp.sdp.split '\r\n'
      outline = sdp_line

      if sdp_line.startsWith 't='
        if sdp_source is z.calling.enum.SDPSource.LOCAL and not z.util.Environment.frontend.is_localhost()
          sdp_lines.push sdp_line
          browser_string = "#{z.util.Environment.browser.name} #{z.util.Environment.browser.version}"
          if z.util.Environment.electron
            outline = "a=tool:electron #{z.util.Environment.version()} #{z.util.Environment.version false} (#{browser_string})"
          else
            outline = "a=tool:webapp #{z.util.Environment.version false} (#{browser_string})"

      else if sdp_line.startsWith 'a=candidate'
        ice_candidates.push sdp_line

      else if sdp_line.startsWith 'a=group'
        if flow_et.negotiation_mode() is z.calling.enum.SDPNegotiationMode.STREAM_CHANGE and sdp_source is z.calling.enum.SDPSource.LOCAL
          sdp_lines.push 'a=x-streamchange'

      # Code to nail in bit-rate and ptime settings for improved performance and experience
      else if sdp_line.startsWith 'm=audio'
        if flow_et.negotiation_mode() is z.calling.enum.SDPNegotiationMode.ICE_RESTART or (sdp_source is z.calling.enum.SDPSource.LOCAL and flow_et.is_group())
          sdp_lines.push sdp_line
          outline = "b=AS:#{SDP_REWRITE_MAPPER_CONFIG.AUDIO_BITRATE}"

      else if sdp_line.startsWith 'a=rtpmap'
        if flow_et.negotiation_mode() is z.calling.enum.SDPNegotiationMode.ICE_RESTART or (sdp_source is z.calling.enum.SDPSource.LOCAL and flow_et.is_group())
          if z.util.StringUtil.includes sdp_line, 'opus'
            sdp_lines.push sdp_line
            outline = "a=ptime:#{SDP_REWRITE_MAPPER_CONFIG.AUDIO_PTIME}"

      sdp_lines.push outline unless outline is undefined

    rtc_sdp.sdp = sdp_lines.join '\r\n'
    return Promise.resolve [ice_candidates.length, rtc_sdp]
