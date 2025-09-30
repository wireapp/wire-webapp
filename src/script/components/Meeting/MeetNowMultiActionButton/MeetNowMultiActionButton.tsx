/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {showContextMenu} from '../../../ui/ContextMenu';

export const MeetNowMultiActionButton = () => {
  const [invertIcon, setInvertIcon] = useState(false);

  const handleMeetingOptionButton = (event: MouseEvent<HTMLElement>) => {
    setInvertIcon(val => !val);
    showContextMenu({
      event,
      anchor: event.target as HTMLElement,
      placement: 'bottom-end',
      offset: 0,
      entries: [
        {
          title: 'Meet Now',
          label: 'Meet Now',
          click: () => {
            handleMeetingButton();
            resetIconInversion();
          },
        },
        {
          title: 'Schedule Meeting',
          label: 'Schedule Meeting',
          click: () => {
            // add scheduling functionality here
            resetIconInversion();
          },
        },
      ],
      identifier: 'message-options-menu',
      resetMenuStates: resetIconInversion,
    });
  };

  const handleMeetingButton = () => {
    // add calling functionality here
  };

  const resetIconInversion = () => setInvertIcon(false);

  return (
    <ButtonGroup>
      <ButtonGroup.Button
        variant={ButtonVariant.TERTIARY}
        css={callingButtonGroupStyles}
        icon={<CallIcon />}
        onClick={handleMeetingButton}
      >
        Meet now
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
