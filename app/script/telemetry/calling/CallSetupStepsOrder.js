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

z.telemetry.calling.CallSetupStepsOrder = {
  ANSWER: [
    z.telemetry.calling.CallSetupSteps.STREAM_RECEIVED,
    z.telemetry.calling.CallSetupSteps.PEER_CONNECTION_CREATED,
    z.telemetry.calling.CallSetupSteps.REMOTE_SDP_SET,
    z.telemetry.calling.CallSetupSteps.LOCAL_SDP_SET,
    z.telemetry.calling.CallSetupSteps.ICE_GATHERING_COMPLETED,
    z.telemetry.calling.CallSetupSteps.LOCAL_SDP_SEND,
    z.telemetry.calling.CallSetupSteps.ICE_CONNECTION_CONNECTED,
  ],
  OFFER: [
    z.telemetry.calling.CallSetupSteps.STREAM_RECEIVED,
    z.telemetry.calling.CallSetupSteps.PEER_CONNECTION_CREATED,
    z.telemetry.calling.CallSetupSteps.LOCAL_SDP_SET,
    z.telemetry.calling.CallSetupSteps.ICE_GATHERING_COMPLETED,
    z.telemetry.calling.CallSetupSteps.LOCAL_SDP_SEND,
    z.telemetry.calling.CallSetupSteps.REMOTE_SDP_SET,
    z.telemetry.calling.CallSetupSteps.ICE_CONNECTION_CONNECTED,
  ],
};
