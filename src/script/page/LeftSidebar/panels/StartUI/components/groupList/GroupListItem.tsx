/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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
import {GroupAvatar} from 'Components/avatar/GroupAvatar';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {handleKeyDown} from 'Util/KeyboardUtil';

import type {Conversation} from '../../../../../../entity/Conversation';
import {generateConversationUrl} from '../../../../../../router/routeGenerator';
import {navigate} from '../../../../../../router/Router';

export interface GroupListItemProps {
  click: (group: Conversation) => void;
  group: Conversation;
}

const GroupListItem: React.FC<GroupListItemProps> = ({click, group}) => {
  const {
    display_name: displayName,
    participating_user_ets: participatingUserEts,
    is1to1,
  } = useKoSubscribableChildren(group, ['display_name', 'participating_user_ets', 'is1to1']);

  const onClick = () => {
    click(group);
    navigate(generateConversationUrl(group.qualifiedId));
  };

  return (
    <div
      role="button"
      tabIndex={TabIndex.FOCUSABLE}
      key={group.id}
      data-uie-name="item-group"
      className="search-list-item"
      data-uie-uid={`${group.id}`}
      onClick={onClick}
      onKeyDown={e => handleKeyDown(e, onClick)}
      data-uie-value={displayName}
    >
      <div className="search-list-item-image">
        {is1to1 && <Avatar avatarSize={AVATAR_SIZE.SMALL} participant={participatingUserEts[0]} />}
        {!is1to1 && <GroupAvatar users={participatingUserEts} />}
      </div>
      <div className="search-list-item-header">{displayName}</div>
    </div>
  );
};

export {GroupListItem};
