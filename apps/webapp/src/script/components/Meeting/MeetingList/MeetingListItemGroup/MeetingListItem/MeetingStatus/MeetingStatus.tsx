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

import {memo, useMemo} from 'react';

import type {QualifiedId} from '@wireapp/api-client/lib/user';

import {Button, ButtonVariant, CallIcon} from '@wireapp/react-ui-kit';

import {
  joinButtonContainerStyles,
  joinButtonIconStyles,
  joinButtonStyles,
  participatingStatusIconStyles,
  participatingStatusStyles,
} from 'Components/Meeting/MeetingList/MeetingListItemGroup/MeetingListItem/MeetingStatus/meetingStatus.styles';
import {useJoinMeetingCall} from 'Components/Meeting/useJoinMeetingCall';
import {getMeetingStatusAt, MeetingStatuses} from 'Components/Meeting/utils/meetingStatusUtil';
import {useApplicationContext} from 'src/script/page/rootProvider';

export type UseJoinMeetingCallResult = ReturnType<typeof useJoinMeetingCall>;

export interface MeetingStatusProps {
  qualifiedConversation: QualifiedId;
  start_date: string;
  end_date: string;
  attending?: boolean;
  nowMilliseconds: number;
  useJoinMeetingCallHook?: (qualifiedConversationId: QualifiedId) => UseJoinMeetingCallResult;
}

const MeetingStatusComponent = ({
  qualifiedConversation,
  start_date,
  end_date,
  attending,
  nowMilliseconds,
  useJoinMeetingCallHook = useJoinMeetingCall,
}: MeetingStatusProps) => {
  const {translate} = useApplicationContext();
  const {joinMeeting, isJoinDisabled, isCallActive} = useJoinMeetingCallHook(qualifiedConversation);
  const isAttending = attending ?? isCallActive;

  const meetingStatus = useMemo(
    () => getMeetingStatusAt(nowMilliseconds, start_date, end_date, isAttending),
    [nowMilliseconds, start_date, end_date, isAttending],
  );

  if (meetingStatus === MeetingStatuses.PARTICIPATING) {
    return (
      <div css={participatingStatusStyles}>
        <CallIcon css={participatingStatusIconStyles} /> {translate('meetings.meetingStatus.participating')}
      </div>
    );
  }

  if (meetingStatus === MeetingStatuses.ON_GOING) {
    return (
      <div css={joinButtonContainerStyles}>
        <Button
          css={joinButtonStyles}
          variant={ButtonVariant.PRIMARY}
          onClick={joinMeeting}
          disabled={isJoinDisabled}
          data-uie-name="join-meeting-call"
        >
          <CallIcon css={joinButtonIconStyles} /> {translate('callJoin')}
        </Button>
      </div>
    );
  }

  return null;
};

export const MeetingStatus = memo(MeetingStatusComponent);
MeetingStatus.displayName = 'MeetingStatus';
