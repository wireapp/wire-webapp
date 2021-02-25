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

import {User} from '../../../entity/User';
import {AssetRepository} from '../../../assets/AssetRepository';
import Avatar, {AVATAR_SIZE} from 'Components/Avatar';
import {useKoSubscribable} from 'Util/ComponentUtil';
import {useEffect, useState} from 'react';
import {ConnectionStatus} from '@wireapp/api-client/src/connection';
import React from 'react';

export interface TopContactProps {
  assetRepository: AssetRepository;
  clickOnUser?: (userEntity: User, event: React.MouseEvent) => void;
  user: User;
}

const TopContact: React.FC<TopContactProps> = ({assetRepository, user, clickOnUser}) => {
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
      onClick={event => {
        clickOnUser(user, event);
      }}
    >
      <Avatar avatarSize={AVATAR_SIZE.LARGE} className="search-list-item-image" participant={user} />
      <div className="search-list-item-content">
        <div className="search-list-item-content-name">{name}</div>
      </div>
    </div>
  );
};

export default TopContact;
