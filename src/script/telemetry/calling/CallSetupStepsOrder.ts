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

import {CallSetupSteps} from './CallSetupSteps';

const CallSetupStepsOrder = {
  ANSWER: [
    CallSetupSteps.STREAM_RECEIVED,
    CallSetupSteps.PEER_CONNECTION_CREATED,
    CallSetupSteps.REMOTE_SDP_SET,
    CallSetupSteps.LOCAL_SDP_SET,
    CallSetupSteps.ICE_GATHERING_COMPLETED,
    CallSetupSteps.LOCAL_SDP_SEND,
    CallSetupSteps.ICE_CONNECTION_CONNECTED,
  ],
  OFFER: [
    CallSetupSteps.STREAM_RECEIVED,
    CallSetupSteps.PEER_CONNECTION_CREATED,
    CallSetupSteps.LOCAL_SDP_SET,
    CallSetupSteps.ICE_GATHERING_COMPLETED,
    CallSetupSteps.LOCAL_SDP_SEND,
    CallSetupSteps.REMOTE_SDP_SET,
    CallSetupSteps.ICE_CONNECTION_CONNECTED,
  ],
};

export {CallSetupStepsOrder};
