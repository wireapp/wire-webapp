/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {useEffect, useRef} from 'react';
import {CallingRepository} from '../../calling/CallingRepository';
import {Call} from '../../calling/Call';
import {MuteState} from '../../calling/CallState';
import {useKeyPress} from '../../hooks/useKeypress';

interface PushToTalkHandlerProps {
  callingRepository: CallingRepository;
  call: Call;
}

const PushToTalkHandler: React.FC<PushToTalkHandlerProps> = ({callingRepository, call}) => {
  const spacePress = useKeyPress(' ');
  const isUnmuted = useRef(false);

  useEffect(() => {
    const isUnmuteAllowed = call.muteState() === MuteState.SELF_MUTED || call.muteState() === MuteState.REMOTE_MUTED;
    if (!spacePress && isUnmuted.current) {
      callingRepository.muteCall(call, true);
      isUnmuted.current = false;
    } else if (spacePress && isUnmuteAllowed) {
      callingRepository.muteCall(call, false);
      isUnmuted.current = true;
    }
    return () => undefined;
  }, [spacePress, callingRepository, call]);

  return null;
};

export {PushToTalkHandler};
