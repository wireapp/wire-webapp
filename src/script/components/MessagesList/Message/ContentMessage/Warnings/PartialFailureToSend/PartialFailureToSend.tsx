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
import {countBy, map} from 'underscore';

import {Bold, Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';

import {warning} from '../Warnings.styles';

export type User = {qualifiedId: QualifiedId; username: () => string};
type Props = {
  failedToSend: {queued?: QualifiedUserClients; failed?: QualifiedId[]};
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

function generateUnreachableUsers(users: QualifiedId[]) {
  const userCountByDomain = countBy(users, 'domain');
  const unreachableUsers = map(userCountByDomain, (count, domain) => ({count, domain}));
  return unreachableUsers;
}

export const PartialFailureToSendWarning = ({failedToSend, knownUsers}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const {queued = {}, failed = []} = failedToSend;

  const userCount =
    Object.entries(queued).reduce((count, [_domain, users]) => count + Object.keys(users).length, 0) + failed.length;

  const showToggle = userCount > 1;

  const {namedUsers} = generateNamedUsers(knownUsers, queued);

  const unreachableUsers = generateUnreachableUsers(failed);

  const FailedToSendToOne =
    namedUsers.length === 1
      ? {head: namedUsers[0].username(), rest: t('messageFailedToSendWillReceiveSingular')}
      : {
          head: t('messageFailedToSendParticipantsFromDomainSingular', {
            domain: unreachableUsers[0]?.domain,
          }),
          rest: t('messageFailedToSendWillNotReceiveSingular'),
        };

  const message = !showToggle
    ? FailedToSendToOne
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
              {namedUsers.length !== 0 && (
                <>
                  {namedUsers
                    .map(user => (
                      <Bold
                        css={warning}
                        data-uie-name="recipient"
                        data-uie-value={user.qualifiedId.id}
                        key={user.qualifiedId.id}
                      >
                        {user.username()}
                      </Bold>
                    ))
                    .reduce<React.ReactNode[]>((prev, element) => {
                      return prev.length === 0 ? [element] : [...prev, ', ', element];
                    }, [])}
                  {` ${t('messageFailedToSendWillReceive')}`}
                </>
              )}
              {failed && (
                <p data-uie-name="failed">
                  {unreachableUsers
                    .map(user => (
                      <Bold css={warning} data-uie-name="unreachable-domain" key={user.domain + user.count.toString()}>
                        {user.count > 1
                          ? t('messageFailedToSendParticipantsFromDomain', {
                              count: user.count.toString(),
                              domain: user.domain,
                            })
                          : t('messageFailedToSendParticipantsFromDomainSingular', {
                              domain: user.domain,
                            })}
                      </Bold>
                    ))
                    .reduce<React.ReactNode[]>((prev, element) => {
                      return prev.length === 0 ? [element] : [...prev, ', ', element];
                    }, [])}
                  {unreachableUsers.length === 1
                    ? ` ${t('messageFailedToSendWillNotReceiveSingular')}`
                    : ` ${t('messageFailedToSendWillNotReceive')}`}
                </p>
              )}
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
