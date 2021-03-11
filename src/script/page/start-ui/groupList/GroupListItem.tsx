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

import Avatar, {AVATAR_SIZE} from 'Components/Avatar';
import React from 'react';
import {useKoSubscribable} from 'Util/ComponentUtil';
import {AssetRepository} from '../../../assets/AssetRepository';
import type {Conversation} from '../../../entity/Conversation';
import {generateConversationUrl} from '../../../router/routeGenerator';
import {Router} from '../../../router/Router';
import GroupAvatar from 'Components/avatar/GroupAvatar';

export interface GroupListItemProps {
  assetRepository: AssetRepository;
  click: (group: Conversation) => void;
  group: Conversation;
  router: Router;
}

const GroupListItem: React.FC<GroupListItemProps> = ({assetRepository, click, group, router}) => {
  const displayName = useKoSubscribable(group.display_name);
  const participatingUserEts = useKoSubscribable(group.participating_user_ets);
  const is1to1 = useKoSubscribable(group.is1to1);
  return (
    <div
      key={group.id}
      data-uie-name="item-group"
      className="search-list-item"
      data-uie-uid={`${group.id}`}
      onClick={() => {
        click(group);
        router.navigate(generateConversationUrl(group.id));
      }}
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

export default GroupListItem;
