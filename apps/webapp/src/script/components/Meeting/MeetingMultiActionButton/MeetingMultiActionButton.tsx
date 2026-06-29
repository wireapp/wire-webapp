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

import {MouseEvent} from 'react';

import {Button, ButtonVariant, CallIcon} from '@wireapp/react-ui-kit';

import {
  callingButtonIconStyles,
  callingButtonStyles,
} from 'Components/Meeting/MeetingMultiActionButton/MeetingMultiActionButton.styles';
import {useMeetingActions} from 'Components/Meeting/useMeetingActions';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {showContextMenu} from '../../../ui/contextMenu';

export interface MeetingMultiActionButtonProps {
  useMeetingActionsHook?: typeof useMeetingActions;
  triggerContextMenu?: typeof showContextMenu;
}

export const MeetingMultiActionButton = ({
  triggerContextMenu = showContextMenu,
  useMeetingActionsHook = useMeetingActions,
}: MeetingMultiActionButtonProps) => {
  const {translate} = useApplicationContext();
  const {handleMeetNow, handleScheduleMeeting} = useMeetingActionsHook();

  const handleCreateMeetingClick = (event: MouseEvent<HTMLElement>) => {
    triggerContextMenu({
      event,
      anchor: event.currentTarget,
      placement: 'bottom-start',
      offset: 0,
      entries: [
        {
          title: translate('meetings.action.meetNow'),
          label: translate('meetings.action.meetNow'),
          click: () => {
            handleMeetNow();
          },
        },
        {
          title: translate('meetings.action.scheduleMeeting'),
          label: translate('meetings.action.scheduleMeeting'),
          click: () => {
            handleScheduleMeeting();
          },
        },
      ],
      identifier: 'meeting-actions-menu',
    });
  };

  return (
    <Button
      variant={ButtonVariant.TERTIARY}
      css={callingButtonStyles}
      onClick={handleCreateMeetingClick}
      data-uie-name="create-meeting"
    >
      <CallIcon css={callingButtonIconStyles} /> {translate('meetings.action.createMeeting')}
    </Button>
  );
};
