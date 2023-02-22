/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {useState} from 'react';

import type {QualifiedUserClients} from '@wireapp/api-client/lib/conversation';
import {QualifiedId} from '@wireapp/api-client/lib/user';

import {Bold, Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';

import {warning} from './FailedToSendWarning.styles';

export type User = {qualifiedId: QualifiedId; username: () => string};
type Props = {
  failedToSend: QualifiedUserClients;
  knownUsers: User[];
};

type ParsedUsers = {namedUsers: User[]; unknownUsers: QualifiedId[]};

function generateNamedUsers(users: User[], userClients: QualifiedUserClients): ParsedUsers {
  return Object.entries(userClients).reduce<ParsedUsers>(
    (namedUsers, [domain, domainUsers]) => {
      const domainNamedUsers = Object.keys(domainUsers).reduce<ParsedUsers>(
        (domainNamedUsers, userId) => {
          const user = users.find(user => matchQualifiedIds(user.qualifiedId, {id: userId, domain}));
          if (user) {
            domainNamedUsers.namedUsers.push(user);
          } else {
            domainNamedUsers.unknownUsers.push({id: userId, domain});
          }
          return domainNamedUsers;
        },
        {namedUsers: [], unknownUsers: []},
      );
      namedUsers.namedUsers.push(...domainNamedUsers.namedUsers);
      namedUsers.unknownUsers.push(...domainNamedUsers.unknownUsers);
      return namedUsers;
    },
    {namedUsers: [], unknownUsers: []},
  );
}

export const FailedToSendWarning = ({failedToSend, knownUsers}: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  const userCount = Object.entries(failedToSend).reduce(
    (count, [_domain, users]) => count + Object.keys(users).length,
    0,
  );

  const showToggle = userCount > 1;

  const {namedUsers} = generateNamedUsers(knownUsers, failedToSend);

  const message =
    namedUsers.length === 1
      ? {head: namedUsers[0].username(), rest: t('messageFailedToSendToOne')}
      : {
          head: t('messageFailedToSendParticipants', {count: userCount.toString()}),
          rest: t('messageFailedToSendToSome'),
        };

  return (
    <div>
      <p css={warning}>
        <Bold css={warning}>{message.head}</Bold> {message.rest}
      </p>
      {showToggle && (
        <>
          {isOpen && (
            <p css={warning}>
              {namedUsers
                .map(user => (
                  <span data-uie-name="recipient" data-uie-value={user.qualifiedId.id} key={user.qualifiedId.id}>
                    {user.username()}
                  </span>
                ))
                .reduce<React.ReactNode[]>((prev, element) => {
                  return prev.length === 0 ? [element] : [...prev, ', ', element];
                }, [])}
              {` ${t('messageFailedToSendWillReceive')}`}
            </p>
          )}
          <Button type="button" variant={ButtonVariant.TERTIARY} onClick={() => setIsOpen(state => !state)}>
            {isOpen ? t('messageFailedToSendHideDetails') : t('messageFailedToSendShowDetails')}
          </Button>
        </>
      )}
    </div>
  );
};
