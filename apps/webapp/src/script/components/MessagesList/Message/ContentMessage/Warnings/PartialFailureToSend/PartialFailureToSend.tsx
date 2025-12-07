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
import {useMessageFocusedTabIndex} from 'Components/MessagesList/Message/util';
import {Config} from 'src/script/Config';
import {countBy, map} from 'underscore';
import {t} from 'Util/LocalizerUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';

import {Bold, Button, ButtonVariant, Link, LinkVariant} from '@wireapp/react-ui-kit';

import {backendErrorLink, button, warning, wrapper} from '../Warnings.styles';

export type User = {qualifiedId: QualifiedId; name: () => string};
type Props = {
  failedToSend: {
    queued?: QualifiedUserClients | QualifiedId[];
    failed?: QualifiedId[];
  };
  isMessageFocused: boolean;
  knownUsers: User[];
};

const config = Config.getConfig();

type ParsedUsers = {namedUsers: User[]; unknownUsers: QualifiedId[]};

function generateNamedUsers(
  users: User[],
  userClientsOrQualifiedIds: QualifiedUserClients | QualifiedId[],
): ParsedUsers {
  if (Array.isArray(userClientsOrQualifiedIds)) {
    return userClientsOrQualifiedIds.reduce<ParsedUsers>(
      (parsedUsers, currentQulifiedId) => {
        const user = users.find(user => matchQualifiedIds(user.qualifiedId, currentQulifiedId));
        if (user && user.name()) {
          parsedUsers.namedUsers.push(user);
        } else {
          parsedUsers.unknownUsers.push(currentQulifiedId);
        }
        return parsedUsers;
      },
      {namedUsers: [], unknownUsers: []},
    );
  }
  return Object.entries(userClientsOrQualifiedIds).reduce<ParsedUsers>(
    (namedUsers, [domain, domainUsers]) => {
      const domainNamedUsers = Object.keys(domainUsers).reduce<ParsedUsers>(
        (domainNamedUsers, userId) => {
          const user = users.find(user => matchQualifiedIds(user.qualifiedId, {id: userId, domain}));
          if (user && user.name()) {
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
  return map(userCountByDomain, (count, domain) => ({count, domain}));
}

function joinWith(elements: React.ReactNode[], separator: string) {
  return elements.reduce<React.ReactNode[]>((prev, element) => {
    return prev.length === 0 ? [element] : [...prev, separator, element];
  }, []);
}

export const PartialFailureToSendWarning = ({failedToSend, isMessageFocused, knownUsers}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const {queued = {}, failed = []} = failedToSend;

  const userCount = Array.isArray(queued)
    ? queued.length
    : Object.entries(queued).reduce((count, [_domain, users]) => count + Object.keys(users).length, 0) + failed.length;
  const messageFocusedTabIndex = useMessageFocusedTabIndex(isMessageFocused);

  const showToggle = userCount > 1;

  const {namedUsers, unknownUsers} = generateNamedUsers(knownUsers, queued);

  const unreachableUsers = generateUnreachableUsers([...failed, ...unknownUsers]);

  const message = {head: '', rest: ''};
  if (showToggle) {
    message.head = t('messageFailedToSendParticipants', {count: userCount.toString()});
    message.rest = t('messageFailedToSendPlural');
  } else if (namedUsers.length === 1) {
    message.head = namedUsers[0].name();
    message.rest = t('messageFailedToSendWillReceiveSingular');
  } else if (unreachableUsers.length === 1) {
    message.head = t('messageFailedToSendParticipantsFromDomainSingular', {domain: unreachableUsers[0].domain});
    message.rest = t('messageFailedToSendWillNotReceiveSingular');
  }

  return (
    <div css={wrapper}>
      <p css={warning}>
        <Bold css={warning}>{message.head}</Bold> {message.rest}
      </p>
      {showToggle && (
        <>
          {isOpen && (
            <>
              {/* maps through the known users that will receive the message later:
              "Alice, Bob will get your message later" */}
              {namedUsers.length !== 0 && (
                <p css={warning}>
                  {joinWith(
                    namedUsers.map(user => (
                      <Bold
                        css={warning}
                        data-uie-name="named-user"
                        data-uie-value={user.qualifiedId.id}
                        key={user.qualifiedId.id}
                      >
                        {user.name()}
                      </Bold>
                    )),
                    ', ',
                  )}
                  {` ${t('messageFailedToSendWillReceivePlural')}`}
                </p>
              )}

              {/* maps through the unreachable users that will never receive the message:
              "3 participants from alpha.domain, 1 participant from beta.domain won't get your message" */}
              {unreachableUsers.length !== 0 && (
                <p css={warning}>
                  {joinWith(
                    unreachableUsers.map(user => (
                      <Bold css={warning} data-uie-name="unreachable-domain" key={user.domain + user.count.toString()}>
                        {user.count > 1
                          ? t('messageFailedToSendParticipantsFromDomainPlural', {
                              count: user.count.toString(),
                              domain: user.domain,
                            })
                          : t('messageFailedToSendParticipantsFromDomainSingular', {
                              domain: user.domain,
                            })}
                      </Bold>
                    )),
                    ', ',
                  )}
                  {unreachableUsers.length === 1
                    ? ` ${t('messageFailedToSendWillNotReceiveSingular')}`
                    : ` ${t('messageFailedToSendWillNotReceivePlural')}`}{' '}
                  <Link
                    tabIndex={messageFocusedTabIndex}
                    targetBlank
                    variant={LinkVariant.PRIMARY}
                    href={config.URL.SUPPORT.OFFLINE_BACKEND}
                    data-uie-name="go-offline-backend"
                    css={backendErrorLink}
                  >
                    {t('offlineBackendLearnMore')}
                  </Link>
                </p>
              )}
            </>
          )}
          <Button
            css={button}
            type="button"
            tabIndex={messageFocusedTabIndex}
            variant={ButtonVariant.TERTIARY}
            onClick={() => setIsOpen(state => !state)}
          >
            {isOpen ? t('messageFailedToSendHideDetails') : t('messageFailedToSendShowDetails')}
          </Button>
        </>
      )}
    </div>
  );
};
