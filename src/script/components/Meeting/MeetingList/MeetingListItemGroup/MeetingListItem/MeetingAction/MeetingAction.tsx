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

import {MouseEvent} from 'react';

import {
  CallIcon,
  CirclePlusIcon,
  CloseIcon,
  EditIcon,
  IconButton,
  MoreIcon,
  ShareLinkIcon,
  TrashIcon,
} from '@wireapp/react-ui-kit';

import {
  contextMenuDangerItemIconStyles,
  contextMenuDangerItemStyles,
  iconContainerStyle,
  iconStyles,
} from 'Components/Meeting/MeetingList/MeetingListItemGroup/MeetingListItem/MeetingAction/MeetingAction.styles';

import {showContextMenu} from '../../../../../../ui/ContextMenu';

export const MeetingAction = () => {
  const handleActionButton = (event: MouseEvent<HTMLElement>) => {
    showContextMenu({
      event,
      entries: [
        {
          icon: () => <CallIcon />,
          label: 'Start meeting',
        },
        {
          icon: () => <CirclePlusIcon />,
          label: 'Create conversation',
        },
        {
          icon: () => <ShareLinkIcon />,
          label: 'Copy link',
        },
        {
          icon: () => <EditIcon />,
          label: 'Edit meeting',
        },
        {
          css: contextMenuDangerItemStyles,
          icon: () => <CloseIcon css={contextMenuDangerItemIconStyles} />,
          label: 'Remove meeting for me',
        },
        {
          css: contextMenuDangerItemStyles,
          icon: () => <TrashIcon css={contextMenuDangerItemIconStyles} />,
          label: 'Delete meeting for everyone',
        },
      ],
      identifier: 'message-options-menu',
    });
  };

  return (
    <IconButton css={iconContainerStyle} onClick={handleActionButton}>
      <MoreIcon width={16} height={16} css={iconStyles} />
    </IconButton>
  );
};
