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
import {CallingRepository} from 'src/script/calling/CallingRepository';
import {CallState, CallingViewMode} from 'src/script/calling/CallState';
import {TeamState} from 'src/script/team/TeamState';
import {UserState} from 'src/script/user/UserState';
import {CallActions} from 'src/script/view_model/CallingViewModel';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {CallingCell} from '../CallingCell';

interface DetachedCallingCellProps {
  callActions: CallActions;
  callingRepository: CallingRepository;
  pushToTalkKey: string | null;
  hasAccessToCamera: boolean;
  callState?: CallState;
  teamState?: TeamState;
  userState?: UserState;
}

//TODO: This is a temporary solution for PoC to enable detached calling cell feature
let isDetachedCallEnabled = false;
export const DetachedCallingCellFeature = {
  set: (shouldEnable: boolean) => {
    isDetachedCallEnabled = shouldEnable;
  },
  get: () => isDetachedCallEnabled,
};

export const DetachedCallingCell = ({
  callActions,
  callingRepository,
  pushToTalkKey,
  hasAccessToCamera,
  callState = container.resolve(CallState),
  teamState = container.resolve(TeamState),
  userState = container.resolve(UserState),
}: DetachedCallingCellProps) => {
  const {classifiedDomains} = useKoSubscribableChildren(teamState, ['classifiedDomains']);
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
    <DetachedWindow name="WIRE_PICTURE_IN_PICTURE_CALL" width={290} height={290} onClose={closeDetachedWindow}>
      <CallingCell
        classifiedDomains={classifiedDomains}
        call={activeCall}
        callActions={callActions}
        callingRepository={callingRepository}
        pushToTalkKey={pushToTalkKey}
        isFullUi
        hasAccessToCamera={hasAccessToCamera}
        isSelfVerified={selfUser.is_verified()}
        setMaximizedParticipant={participant => activeCall.maximizedParticipant(participant)}
      />
    </DetachedWindow>
  );
};
