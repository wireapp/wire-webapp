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
import ParticipantAvatar, {AVATAR_SIZE} from 'Components/ParticipantAvatar';
import type {User} from '../entity/User';
import {registerReactComponent} from 'Util/ComponentUtil';
import {AssetRepository} from '../assets/AssetRepository';
import {container} from 'tsyringe';

export interface TopPeopleProps {
  clickOnContact: (userEntity: User, event: React.MouseEvent) => void;
  max?: number;
  users: User[];
}

const TopPeople: React.FC<TopPeopleProps> = ({clickOnContact, max, users}) => {
  const assetRepository = container.resolve(AssetRepository);
  max ??= 9;
  const displayedUsers = users.slice(0, max);
  const searchListItems = displayedUsers.map(user => {
    return (
      <div
        key={user.id}
        className="search-list-item"
        data-uie-uid={user.id}
        data-uie-value={user.name()}
        data-uie-status={user.connection().status()}
        onClick={event => {
          clickOnContact(user, event);
        }}
        data-uie-name="item-user"
      >
        <ParticipantAvatar
          className="search-list-item-image"
          assetRepository={assetRepository}
          size={AVATAR_SIZE.LARGE}
          participant={user}
        />
        <div className="search-list-item-content">
          <div className="search-list-item-content-name" data-bind="text: name"></div>
        </div>
      </div>
    );
  });

  return <div className="search-list search-list-sm">{searchListItems}</div>;
};

export default TopPeople;

registerReactComponent<TopPeopleProps>('top-people', {
  component: TopPeople,
  optionalParams: ['max'],
  template: '<div data-bind="react: {assetRepository, clickOnContact, users: ko.unwrap(users), max}"></div>',
});
