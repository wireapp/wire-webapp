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

class z.calling.mapper.ICECandidateMapper
  constructor: ->
    @logger = new z.util.Logger 'z.calling.mapper.ICECandidateMapper', z.config.LOGGER.OPTIONS

  ###
  @param ice_candidate [RTCIceCandidate] Interactive Connectivity Establishment (ICE) Candidate
  ###
  map_ice_object_to_message: (ice_candidate) ->
    message =
      sdp: ice_candidate.candidate
      sdp_mline_index: ice_candidate.sdpMLineIndex
      sdp_mid: ice_candidate.sdpMid

    return message

  # We have to convert camel-case to underscores
  map_ice_message_to_object: (ice_message) ->
    candidate_info =
      candidate: ice_message.sdp
      sdpMLineIndex: ice_message.sdp_mline_index
      sdpMid: ice_message.sdp_mid

    return new RTCIceCandidate candidate_info
