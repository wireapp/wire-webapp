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

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {Avatar, AVATAR_SIZE} from 'Components/avatar';
import {UserClassifiedBar} from 'Components/classifiedBar/classifiedBar';
import {UnverifiedUserWarning} from 'Components/modals/userModal';
import {User} from 'Repositories/entity/User';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {useKoSubscribableChildren} from 'Util/componentUtil';

import {E2eEncryptionMessage} from '../e2eEncryptionMessage/e2eEncryptionMessage';

interface ConnectedMessageProps {
  classifiedDomains?: string[];
  onClickCancelRequest: () => void;
  showServicesWarning?: boolean;
  user: User;
}

export const ConnectedMessage = ({
  user,
  onClickCancelRequest,
  showServicesWarning = false,
  classifiedDomains,
}: ConnectedMessageProps) => {
  const {translate} = useApplicationContext();
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
            {translate('conversationConnectionCancelRequest')}
          </Button>
        </>
      )}

      {showServicesWarning && (
        <div className="message-services-warning" data-uie-name="label-services-warning">
          {translate('conversationServicesWarning')}
        </div>
      )}

      {!isOutgoingRequest && <E2eEncryptionMessage isCellsConversation={false} />}
    </div>
  );
};
