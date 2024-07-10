/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {container} from 'tsyringe';

import {DetachedWindow} from 'Components/DetachedWindow';
import {Call} from 'src/script/calling/Call';
import {CallingRepository} from 'src/script/calling/CallingRepository';
import {CallState, CallingViewMode, DesktopScreenShareMenu} from 'src/script/calling/CallState';
import {MediaRepository} from 'src/script/media/MediaRepository';
import {UserState} from 'src/script/user/UserState';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {CallingContainer} from '../CallingOverlayContainer';

interface DetachedCallingCellProps {
  callingRepository: CallingRepository;
  mediaRepository: MediaRepository;
  toggleScreenshare: (call: Call, desktopScreenShareMenu: DesktopScreenShareMenu) => void;
  callState?: CallState;
  userState?: UserState;
}

export const DetachedCallingCell = ({
  callingRepository,
  mediaRepository,
  toggleScreenshare,
  callState = container.resolve(CallState),
  userState = container.resolve(UserState),
}: DetachedCallingCellProps) => {
  const {joinedCall: activeCall, viewMode} = useKoSubscribableChildren(callState, ['joinedCall', 'viewMode']);
  const {self: selfUser} = useKoSubscribableChildren(userState, ['self']);

  const isDetachedWindow = viewMode === CallingViewMode.DETACHED_WINDOW;

  const closeDetachedWindow = () => {
    callState.viewMode(CallingViewMode.MINIMIZED);
  };

  if (!activeCall || !isDetachedWindow || !selfUser) {
    return null;
  }

  return (
    <DetachedWindow name="WIRE_PICTURE_IN_PICTURE_CALL" width={1026} height={829} onClose={closeDetachedWindow}>
      <CallingContainer
        callingRepository={callingRepository}
        mediaRepository={mediaRepository}
        toggleScreenshare={toggleScreenshare}
      />
    </DetachedWindow>
  );
};
