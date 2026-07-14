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

import {Button, ButtonVariant, CallIcon} from '@wireapp/react-ui-kit';

import {
  joinButtonContainerStyles,
  joinButtonIconStyles,
  joinButtonStyles,
  participatingStatusIconStyles,
  participatingStatusStyles,
} from 'Components/Meeting/MeetingList/MeetingListItemGroup/MeetingListItem/MeetingStatus/meetingStatus.styles';
import {getMeetingStatusAt, MeetingStatuses} from 'Components/Meeting/utils/meetingStatusUtil';
import {useApplicationContext} from 'src/script/page/rootProvider';

export interface MeetingStatusProps {
  start_date: string;
  end_date: string;
  nowMilliseconds: number;
  joinMeeting: () => void;
  isJoinDisabled: boolean;
  isCallActive: boolean;
}

const MeetingStatusComponent = ({
  start_date,
  end_date,
  nowMilliseconds,
  joinMeeting,
  isJoinDisabled,
  isCallActive,
}: MeetingStatusProps) => {
  const {translate} = useApplicationContext();

  const meetingStatus = useMemo(
    () => getMeetingStatusAt(nowMilliseconds, start_date, end_date, isCallActive),
    [nowMilliseconds, start_date, end_date, isCallActive],
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
