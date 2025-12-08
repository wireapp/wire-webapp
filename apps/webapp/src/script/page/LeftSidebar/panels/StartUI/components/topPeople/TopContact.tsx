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

import React, {useEffect, useState} from 'react';

import {ConnectionStatus} from '@wireapp/api-client/lib/connection';

import {TabIndex} from '@wireapp/react-ui-kit';

import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import {User} from 'Repositories/entity/User';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {handleKeyDown, KEY} from 'Util/KeyboardUtil';

interface TopContactProps {
  clickOnUser?: (userEntity: User, event: React.UIEvent) => void;
  user: User;
}

const TopContact = ({user, clickOnUser}: TopContactProps) => {
  const {name, connection} = useKoSubscribableChildren(user, ['name', 'connection']);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>();

  useEffect(() => {
    const subscription = connection?.status.subscribe(newStatus => setConnectionStatus(newStatus));
    return () => subscription?.dispose();
  }, [connection]);

  return (
    <div
      className="search-list-item"
      data-uie-name="item-user"
      data-uie-status={connectionStatus}
      data-uie-uid={user.id}
      data-uie-value={name}
      role="button"
      tabIndex={TabIndex.FOCUSABLE}
      onClick={event => {
        clickOnUser?.(user, event);
      }}
      onKeyPress={event =>
        clickOnUser &&
        handleKeyDown({
          event,
          callback: clickOnUser.bind(this, user, event),
          keys: [KEY.ENTER, KEY.SPACE],
        })
      }
    >
      <Avatar avatarSize={AVATAR_SIZE.LARGE} className="search-list-item-image" participant={user} />
      <div className="search-list-item-content">
        <div className="search-list-item-content-name">{name}</div>
      </div>
    </div>
  );
};

export {TopContact};
