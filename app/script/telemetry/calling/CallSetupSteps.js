/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

window.z = window.z || {};
window.z.telemetry = z.telemetry || {};
window.z.telemetry.calling = z.telemetry.calling || {};

z.telemetry.calling.CallSetupSteps = {
  ICE_CONNECTION_CONNECTED: 'ice_connection_connected',
  ICE_GATHERING_COMPLETED: 'ice_gathering_completed',
  LOCAL_SDP_SEND: 'local_sdp_send',
  LOCAL_SDP_SET: 'local_sdp_set',
  PEER_CONNECTION_CREATED: 'peer_connection_created',
  REMOTE_SDP_SET: 'remote_sdp_set',
  STARTED: 'started',
  STREAM_RECEIVED: 'stream_received',
};
