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

import React, {useEffect, useState} from 'react';
import ParticipantAvatar, {AVATAR_SIZE} from 'Components/ParticipantAvatar';
import type {User} from '../entity/User';
import {registerReactComponent, useKoSubscribable} from 'Util/ComponentUtil';
import {AssetRepository} from '../assets/AssetRepository';
import {container} from 'tsyringe';
import {ConnectionStatus} from '@wireapp/api-client/src/connection';

export interface TopPeopleProps {
  clickOnContact: (userEntity: User, event: React.MouseEvent) => void;
  max?: number;
  users: User[];
}

export interface TopPersonProps {
  assetRepository: AssetRepository;
  clickOnContact: (userEntity: User, event: React.MouseEvent) => void;
  user: User;
}

const TopPerson: React.FC<TopPersonProps> = ({assetRepository, user, clickOnContact}) => {
  const name = useKoSubscribable(user.name);
  const connection = useKoSubscribable(user.connection);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>();

  useEffect(() => {
    const subscription = connection.status.subscribe(newStatus => setConnectionStatus(newStatus));
    return () => subscription.dispose();
  }, [connection]);

  return (
    <div
      className="search-list-item"
      data-uie-name="item-user"
      data-uie-status={connectionStatus}
      data-uie-uid={user.id}
      data-uie-value={name}
      onClick={event => clickOnContact(user, event)}
    >
      <ParticipantAvatar
        assetRepository={assetRepository}
        avatarSize={AVATAR_SIZE.LARGE}
        className="search-list-item-image"
        participant={user}
      />
      <div className="search-list-item-content">
        <div className="search-list-item-content-name">{name}</div>
      </div>
    </div>
  );
};

const TopPeople: React.FC<TopPeopleProps> = ({clickOnContact, max, users}) => {
  const assetRepository = container.resolve(AssetRepository);
  max ??= 9;
  const displayedUsers = users.slice(0, max);
  const searchListItems = displayedUsers.map(user => (
    <TopPerson assetRepository={assetRepository} clickOnContact={clickOnContact} key={user.id} user={user} />
  ));
  return <div className="search-list search-list-sm">{searchListItems}</div>;
};

export default TopPeople;

registerReactComponent<TopPeopleProps>('top-people', {
  component: TopPeople,
  optionalParams: ['max'],
  template: '<div data-bind="react: {assetRepository, clickOnContact, users: ko.unwrap(users), max}"></div>',
});
