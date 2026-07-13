/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {CallingCell} from 'Components/calling/CallingCell';
import {meetingCallingViewStyles} from 'Components/Meeting/MeetingCallingView/meetingCallingView.styles';
import {CallState} from 'Repositories/calling/CallState';
import {TeamState} from 'Repositories/team/TeamState';
import {useApplicationContext, useMainViewModel} from 'src/script/page/rootProvider';
import {useKoSubscribableChildren} from 'Util/componentUtil';

export const MeetingCallingView = () => {
  const {mainViewModel} = useApplicationContext();
  const {calling: callingViewModel} = useMainViewModel();
  const {properties: propertiesRepository} = mainViewModel.content.repositories;
  const callState = container.resolve(CallState);
  const teamState = container.resolve(TeamState);
  const {activeCalls} = useKoSubscribableChildren(callState, ['activeCalls']);
  const {classifiedDomains} = useKoSubscribableChildren(teamState, ['classifiedDomains']);
  const {callingRepository} = callingViewModel;

  const meetingCalls = activeCalls.filter(call => call.conversation.isMeeting());

  if (meetingCalls.length === 0) {
    return null;
  }

  return (
    <div css={meetingCallingViewStyles} data-uie-name="meeting-calling-view">
      {meetingCalls.map(call => {
        const {conversation} = call;

        return (
          <CallingCell
            key={`${conversation.qualifiedId.id}-${conversation.qualifiedId.domain}`}
            classifiedDomains={classifiedDomains}
            call={call}
            callActions={callingViewModel.callActions}
            callingRepository={callingRepository}
            propertiesRepository={propertiesRepository}
            isFullUi
            hasAccessToCamera={callingViewModel.hasAccessToCamera()}
          />
        );
      })}
    </div>
  );
};
