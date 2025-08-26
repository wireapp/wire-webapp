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

import {AssetRepository} from 'Repositories/assets/AssetRepository';
import {User} from 'Repositories/entity/User';

import {TopContact} from './topPeople/TopContact';

interface TopPeopleProps {
  clickOnUser: (user: User, event: React.UIEvent) => void;
  max?: number;
  users: User[];
}

const TopPeople: React.FC<TopPeopleProps> = ({clickOnUser, max, users}) => {
  const assetRepository = container.resolve(AssetRepository);
  max ??= 9;
  const displayedUsers = users.slice(0, max);
  const searchListItems = displayedUsers.map(user => (
    <TopContact assetRepository={assetRepository} clickOnUser={clickOnUser} key={user.id} user={user} />
  ));
  return <div className="search-list search-list-sm">{searchListItems}</div>;
};

export {TopPeople};
