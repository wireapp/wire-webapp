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
import {container} from 'tsyringe';
import GroupAvatar from './list/GroupAvatar';
import {registerReactComponent} from 'Util/ComponentUtil';
import {AssetRepository} from '../assets/AssetRepository';
import ParticipantAvatar, {AVATAR_SIZE} from 'Components/ParticipantAvatar';
import type {Conversation} from '../entity/Conversation';

export interface GroupListProps {
  click: (group: Conversation) => void;
  groups: Conversation[];
}

const GroupList: React.FC<GroupListProps> = ({click, groups}) => {
  const assetRepository = container.resolve(AssetRepository);
  return (
    <div className="search-list search-list-lg">
      {groups.map(group => (
        <div
          key={group.id}
          data-uie-name="item-group"
          className="search-list-item"
          data-uie-uid={group.id}
          onClick={() => click(group)}
          data-uie-value={group.display_name}
          //TODO: What to do?
          data-bind="link_to: getConversationUrl(group.id)"
        >
          <div className="search-list-item-image">
            {group.is1to1() && (
              <ParticipantAvatar
                participant={group.participating_user_ets()[0]}
                size={AVATAR_SIZE.SMALL}
                assetRepository={assetRepository}
              />
            )}
            {!group.is1to1() && <GroupAvatar users={group.participating_user_ets()} />}
          </div>
          <div className="search-list-item-header">{group.display_name}</div>
        </div>
      ))}
    </div>
  );
};

export default GroupList;

registerReactComponent<GroupListProps>('group-list', {
  component: GroupList,
  template: '<div data-bind="react: {click, groups: ko.unwrap(groups)}"></div>',
});
