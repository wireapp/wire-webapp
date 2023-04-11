/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import React from 'react';

import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';

import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import {UserStatusBadges} from 'Components/UserBadges';
import {Participant} from 'src/script/calling/Participant';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {handleKeyDown} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {setContextMenuPosition} from 'Util/util';

import {CallParticipantItemContent} from './CallParticipantItemContent';
import {
  callParticipantListItemWrapper,
  callParticipantListItem,
  callParticipantAvatar,
  callParticipantConnecting,
} from './CallParticipantsListItem.styles';
import {CallParticipantStatusIcons} from './CallParticipantStatusIcons';

export interface CallParticipantsListItemProps {
  callParticipant: Participant;
  showContextMenu: boolean;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  selfInTeam?: boolean;
  isSelfVerified?: boolean;
  isLast?: boolean;
}

export const CallParticipantsListItem = ({
  callParticipant,
  isSelfVerified = false,
  selfInTeam,
  showContextMenu,
  onContextMenu,
  isLast = false,
}: CallParticipantsListItemProps) => {
  const {user} = callParticipant;
  const {isMe: isSelf, isFederated} = user;

  const {isAudioEstablished} = useKoSubscribableChildren(callParticipant, ['isAudioEstablished']);

  const {
    isDirectGuest,
    is_verified: isVerified,
    availability,
    name: userName,
    isExternal,
  } = useKoSubscribableChildren(user, ['isDirectGuest', 'is_verified', 'availability', 'name', 'isExternal']);

  const handleContextKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    handleKeyDown(event, () => {
      const newEvent = setContextMenuPosition(event);
      onContextMenu?.(newEvent as unknown as React.MouseEvent<HTMLDivElement>);
    });
  };

  const reactiveProps =
    isAudioEstablished && showContextMenu
      ? {
          role: 'button',
          tabIndex: TabIndex.FOCUSABLE,
          onContextMenu,
          onClick: onContextMenu,
          onKeyDown: handleContextKeyDown,
        }
      : undefined;

  return (
    <div
      {...reactiveProps}
      data-uie-name="item-user"
      data-uie-value={userName}
      css={callParticipantListItemWrapper(isLast)}
    >
      <div css={callParticipantListItem(true)}>
        <Avatar
          avatarSize={AVATAR_SIZE.SMALL}
          participant={user}
          aria-hidden="true"
          css={callParticipantAvatar(isAudioEstablished)}
        />

        <CallParticipantItemContent
          isAudioEstablished={isAudioEstablished}
          name={userName}
          selfInTeam={selfInTeam}
          availability={availability}
          isSelf={isSelf}
          showContextMenu={showContextMenu}
          onDropdownClick={event => onContextMenu?.(event as unknown as React.MouseEvent<HTMLDivElement>)}
        />

        {isAudioEstablished ? (
          <>
            <UserStatusBadges
              config={{
                guest: isDirectGuest,
                federated: isFederated,
                external: isExternal,
                verified: isSelfVerified && isVerified,
              }}
            />
            <CallParticipantStatusIcons callParticipant={callParticipant} />
          </>
        ) : (
          <span css={callParticipantConnecting}>{t('videoCallParticipantConnecting')}</span>
        )}
      </div>
    </div>
  );
};
