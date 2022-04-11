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
import {registerReactComponent} from 'Util/ComponentUtil';
import {AssetRepository} from '../../../../../assets/AssetRepository';
import type {Conversation} from '../../../../../entity/Conversation';
import {Router} from '../../../../../router/Router';
import GroupListItem from './groupList/GroupListItem';

export interface GroupListProps {
  assetRepository?: AssetRepository;
  click: (group: Conversation) => void;
  groups: Conversation[];
  router?: Router;
}

const GroupList: React.FC<GroupListProps> = ({
  click,
  groups,
  assetRepository = container.resolve(AssetRepository),
  router = container.resolve(Router),
}) => {
  return (
    <div className="search-list search-list-lg">
      {groups.map(group => (
        <GroupListItem assetRepository={assetRepository} click={click} group={group} key={group.id} router={router} />
      ))}
    </div>
  );
};

export default GroupList;

registerReactComponent('group-list', {
  component: GroupList,
  template: '<div data-bind="react: {click, groups: ko.unwrap(groups)}"></div>',
});
