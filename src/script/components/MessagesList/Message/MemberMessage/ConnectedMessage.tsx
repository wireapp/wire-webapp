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

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import {UserClassifiedBar} from 'Components/ClassifiedBar/ClassifiedBar';
import {UnverifiedUserWarning} from 'Components/Modals/UserModal';
import {User} from 'Repositories/entity/User';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {E2eEncryptionMessage} from '../E2eEncryptionMessage/E2eEncryptionMessage';

interface ConnectedMessageProps {
  classifiedDomains?: string[];
  onClickCancelRequest: () => void;
  showServicesWarning?: boolean;
  user: User;
}

export const ConnectedMessage: React.FC<ConnectedMessageProps> = ({
  user,
  onClickCancelRequest,
  showServicesWarning = false,
  classifiedDomains,
}) => {
  const {name, providerName, isOutgoingRequest} = useKoSubscribableChildren(user, [
    'name',
    'providerName',
    'isOutgoingRequest',
  ]);
  const {handle, isService} = user;

  return (
    <div className="message-connected" data-uie-name="element-connected-message">
      <h2 className="message-connected-header">{name}</h2>

      {isService ? (
        <p className="message-connected-provider-name">{providerName}</p>
      ) : (
        <p className="message-connected-username label-username">{handle}</p>
      )}

      {isOutgoingRequest && classifiedDomains && (
        <UserClassifiedBar users={[user]} classifiedDomains={classifiedDomains} />
      )}

      <Avatar
        avatarSize={AVATAR_SIZE.X_LARGE}
        participant={user}
        noBadge={isOutgoingRequest}
        className="message-connected-avatar cursor-default"
        hideAvailabilityStatus
      />

      {isOutgoingRequest && (
        <>
          <div css={{margin: '2em'}}>
            <UnverifiedUserWarning />
          </div>

          <Button variant={ButtonVariant.SECONDARY} onClick={onClickCancelRequest} data-uie-name="do-cancel-request">
            {t('conversationConnectionCancelRequest')}
          </Button>
        </>
      )}

      {showServicesWarning && (
        <div className="message-services-warning" data-uie-name="label-services-warning">
          {t('conversationServicesWarning')}
        </div>
      )}

      {!isOutgoingRequest && <E2eEncryptionMessage />}
    </div>
  );
};
