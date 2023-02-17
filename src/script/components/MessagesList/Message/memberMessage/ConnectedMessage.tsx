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
import {Icon} from 'Components/Icon';
import {ClassifiedBar} from 'Components/input/ClassifiedBar';
import {User} from 'src/script/entity/User';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

export interface ConnectedMessageProps {
  classifiedDomains?: string[];
  onClickCancelRequest: () => void;
  showServicesWarning?: boolean;
  user: User;
}

const ConnectedMessage: React.FC<ConnectedMessageProps> = ({
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

      {isOutgoingRequest && classifiedDomains && <ClassifiedBar users={[user]} classifiedDomains={classifiedDomains} />}

      <Avatar
        avatarSize={AVATAR_SIZE.X_LARGE}
        participant={user}
        noBadge={isOutgoingRequest}
        className="message-connected-avatar cursor-default"
      />

      {isOutgoingRequest && (
        <>
          <div css={{display: 'flex', color: 'var(--danger-color)', fill: 'var(--danger-color)', margin: '2em'}}>
            <Icon.Info css={{height: '1rem', margin: '0.2em 1em', minWidth: '1rem'}} />
            <p>{t('conversationConnectionVerificationWarning')}</p>
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

      {!isOutgoingRequest && (
        <div css={{margin: '56px'}}>
          <p>{t('conversationNewConversation')}</p>
          <div css={{display: 'flex', marginTop: '1rem'}}>
            <div
              css={{
                fill: 'var(--text-input-placeholder)',
                display: 'flex',
                justifyContent: 'center',
                left: 0,
                position: 'absolute',
                width: '56px',
              }}
            >
              <Icon.Info css={{height: 'var(--font-size-base)', margin: '0.2em', with: 'var(--font-size-base)'}} />
            </div>
            <p>{t('conversationUnverifiedUserWarning')}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export {ConnectedMessage};
