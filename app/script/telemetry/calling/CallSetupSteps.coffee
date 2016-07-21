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

z.telemetry.calling.CallSetupSteps =
  ICE_CONNECTION_COMPLETED: 'ice_connection_completed'
  ICE_CONNECTION_CONNECTED: 'ice_connection_connected'
  ICE_CONNECTION_CHECKING: 'ice_connection_checking'
  ICE_GATHERING_COMPLETED: 'ice_gathering_completed'
  ICE_GATHERING_STARTED: 'ice_gathering_started'
  FLOW_RECEIVED: 'flow_received'
  LOCAL_SDP_CREATED: 'local_sdp_created'
  LOCAL_SDP_SEND: 'local_sdp_send'
  LOCAL_SDP_SET: 'local_sdp_set'
  PEER_CONNECTION_CREATED: 'peer_connection_created'
  REMOTE_SDP_RECEIVED: 'remote_sdp_received'
  REMOTE_SDP_SET: 'remote_sdp_set'
  STARTED: 'started'
  STATE_PUT: 'state_put'
  STREAM_RECEIVED: 'stream_received'
  STREAM_REQUESTED: 'stream_requested'
