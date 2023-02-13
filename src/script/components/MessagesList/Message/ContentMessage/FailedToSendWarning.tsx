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

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {matchQualifiedIds} from 'Util/QualifiedId';

export type User = {id: QualifiedId; name: string};
type Props = {
  failedToSend: QualifiedUserClients;
  knownUsers: User[];
};

function generateNamedUsers(users: User[], userClients: QualifiedUserClients): User[] {
  return Object.entries(userClients).reduce<User[]>((namedUsers, [domain, domainUsers]) => {
    const domainNamedUsers = Object.keys(domainUsers).reduce<User[]>((domainNamedUsers, userId) => {
      const user = users.find(user => matchQualifiedIds(user.id, {id: userId, domain}));
      if (user) {
        return [...domainNamedUsers, user];
      }
      return domainNamedUsers;
    }, []);
    return [...namedUsers, ...domainNamedUsers];
  }, []);
}

export const FailedToSendWarning = ({failedToSend, knownUsers}: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  const userCount = Object.entries(failedToSend).reduce(
    (count, [_domain, users]) => count + Object.keys(users).length,
    0,
  );

  const showToggle = userCount > 1;

  const namedUsers = generateNamedUsers(knownUsers, failedToSend);

  const message =
    namedUsers.length === 1
      ? `${namedUsers[0].name} will receive your message later`
      : `${userCount} Participants had issues receiving this message`;

  return (
    <div>
      <p>{message}</p>
      {showToggle && (
        <>
          {isOpen && (
            <div>
              {namedUsers.map(user => (
                <span data-uie-name="recipient" data-uie-value={user.id.id} key={user.id.id}>
                  {user.name}
                </span>
              ))}
            </div>
          )}
          <Button type="button" variant={ButtonVariant.TERTIARY} onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? 'Hide details' : 'Show details'}
          </Button>
        </>
      )}
    </div>
  );
};
