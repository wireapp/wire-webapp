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

import {MouseEvent, useState} from 'react';

import {ButtonGroup, ButtonVariant, CallIcon, TriangleIcon} from '@wireapp/react-ui-kit';

import {
  callingButtonGroupStyles,
  dropdownIconStyles,
} from 'Components/Meeting/MeetNowMultiActionButton/MeetNowMultiActionButton.styles';
import {useMeetingActions} from 'Components/Meeting/useMeetingActions';
import {t} from 'Util/localizerUtil';

import {showContextMenu} from '../../../ui/ContextMenu';

export const MeetNowMultiActionButton = () => {
  const [invertIcon, setInvertIcon] = useState(false);
  const {handleMeetNow, handleScheduleMeeting} = useMeetingActions();

  const handleMeetingOptionButton = (event: MouseEvent<HTMLElement>) => {
    setInvertIcon(val => !val);
    showContextMenu({
      event,
      anchor: event.target as HTMLElement,
      placement: 'bottom-end',
      offset: 0,
      entries: [
        {
          title: t('meetings.action.meetNow'),
          label: t('meetings.action.meetNow'),
          click: () => {
            handleMeetNow();
            resetIconInversion();
          },
        },
        {
          title: t('meetings.action.scheduleMeeting'),
          label: t('meetings.action.scheduleMeeting'),
          click: () => {
            handleScheduleMeeting();
            resetIconInversion();
          },
        },
      ],
      identifier: 'message-options-menu',
      resetMenuStates: resetIconInversion,
    });
  };

  const resetIconInversion = () => setInvertIcon(false);

  return (
    <ButtonGroup>
      <ButtonGroup.Button
        variant={ButtonVariant.TERTIARY}
        css={callingButtonGroupStyles}
        icon={<CallIcon />}
        onClick={handleMeetNow}
      >
        {t('meetings.action.createMeeting')}
      </ButtonGroup.Button>
      <ButtonGroup.Button
        css={callingButtonGroupStyles}
        onClick={handleMeetingOptionButton}
        variant={ButtonVariant.TERTIARY}
        icon={<TriangleIcon height={10} width={10} css={dropdownIconStyles(invertIcon)} />}
      />
    </ButtonGroup>
  );
};
