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

import ko from 'knockout';
import {registerReactComponent} from 'Util/ComponentUtil';
import {User} from '../../entity/User';
import TopContact from './topPeople/TopContact';
import React from 'react';
import {container} from 'tsyringe';
import {AssetRepository} from '../../assets/AssetRepository';

interface TopPeopleProps {
  clickOnUser: (userEntity: User, event: React.MouseEvent) => void;
  max?: number;
  users: ko.ObservableArray<User>;
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

export default TopPeople;

registerReactComponent<TopPeopleProps>('top-people', {
  component: TopPeople,
  optionalParams: ['max'],
  template: '<div data-bind="react: {clickOnUser, users: ko.unwrap(users), max}"></div>',
});
