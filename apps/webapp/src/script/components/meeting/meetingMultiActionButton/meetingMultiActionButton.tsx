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

import {Button, ButtonVariant, CalendarIcon, CallIcon} from '@wireapp/react-ui-kit';

import {
  callingButtonGroupStyles,
  callingButtonIconStyles,
  callingButtonStyles,
} from 'Components/meeting/meetingMultiActionButton/meetingMultiActionButton.styles';
import {useMeetingActions} from 'Components/meeting/useMeetingActions';
import {useApplicationContext} from 'src/script/page/rootProvider';

export interface MeetingMultiActionButtonProps {
  useMeetingActionsHook?: typeof useMeetingActions;
}

export const MeetingMultiActionButton = ({
  useMeetingActionsHook = useMeetingActions,
}: MeetingMultiActionButtonProps) => {
  const {translate} = useApplicationContext();
  const {handleMeetNow, handleScheduleMeeting} = useMeetingActionsHook();

  return (
    <div className="buttons-group" css={callingButtonGroupStyles}>
      <Button
        className="buttons-group-button buttons-group-button-left"
        variant={ButtonVariant.TERTIARY}
        onClick={handleMeetNow}
        data-uie-name="meet-now"
        css={callingButtonStyles}
      >
        <CallIcon css={callingButtonIconStyles} aria-hidden="true" /> {translate('meetings.action.meetNow')}
      </Button>
      <Button
        className="buttons-group-button buttons-group-button-right"
        variant={ButtonVariant.TERTIARY}
        onClick={handleScheduleMeeting}
        data-uie-name="schedule-meeting"
        css={callingButtonStyles}
      >
        <CalendarIcon css={callingButtonIconStyles} aria-hidden="true" /> {translate('meetings.action.scheduleMeeting')}
      </Button>
    </div>
  );
};
