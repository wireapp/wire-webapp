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
import {ParticipantItemContent} from 'Components/ParticipantItemContent';
import {UserStatusBadges} from 'Components/UserBadges';
import {Participant} from 'src/script/calling/Participant';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {handleKeyDown} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {capitalizeFirstChar} from 'Util/StringUtil';
import {setContextMenuPosition} from 'Util/util';

import {CallParticipantStatusIcons} from './CallParticipantStatusIcons';

export interface CallParticipantsListItemProps {
  callParticipant: Participant;
  selfInTeam?: boolean;
  isSelfVerified?: boolean;
  showDropdown?: boolean;
  onContextMenu?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}

export const CallParticipantsListItem = ({
  callParticipant,
  isSelfVerified = false,
  selfInTeam,
  showDropdown = false,
  onContextMenu,
}: CallParticipantsListItemProps) => {
  const {user} = callParticipant;
  const {isMe: isSelf, isFederated} = user;

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

  const selfString = `(${capitalizeFirstChar(t('conversationYouNominative'))})`;

  return (
    <div
      tabIndex={TabIndex.FOCUSABLE}
      role="button"
      onContextMenu={onContextMenu}
      onClick={onContextMenu}
      onKeyDown={handleContextKeyDown}
      data-uie-name="item-user"
      data-uie-value={userName}
      aria-label={t('accessibility.openConversation', userName)}
      className="participant-item-wrapper no-interaction no-underline"
    >
      <div className="participant-item">
        <div className="participant-item__image">
          <Avatar avatarSize={AVATAR_SIZE.SMALL} participant={user} aria-hidden="true" />
        </div>

        <ParticipantItemContent
          name={userName}
          selfInTeam={selfInTeam}
          availability={availability}
          {...(isSelf && {selfString})}
          {...(showDropdown && {
            onDropdownClick: event => onContextMenu?.(event as unknown as React.MouseEvent<HTMLDivElement>),
          })}
        />

        <UserStatusBadges
          config={{
            guest: isDirectGuest,
            federated: isFederated,
            external: isExternal,
            verified: isSelfVerified && isVerified,
          }}
        />

        <CallParticipantStatusIcons callParticipant={callParticipant} />
      </div>
    </div>
  );
};
