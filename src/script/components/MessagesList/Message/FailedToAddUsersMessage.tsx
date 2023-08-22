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

import React, {FC, ReactNode, useMemo, useState} from 'react';

import {AddUsersFailureReasons} from '@wireapp/core/lib/conversation';
import {container} from 'tsyringe';
import {groupBy} from 'underscore';

import {Button, ButtonVariant, Link, LinkVariant} from '@wireapp/react-ui-kit';

import {Icon} from 'Components/Icon';
import {Config} from 'src/script/Config';
import {User} from 'src/script/entity/User';
import {UserState} from 'src/script/user/UserState';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';

import {backendErrorLink, warning} from './ContentMessage/Warnings/Warnings.styles';
import {MessageTime} from './MessageTime';
import {useMessageFocusedTabIndex} from './util';

import {FailedToAddUsersMessage as FailedToAddUsersMessageEntity} from '../../../entity/message/FailedToAddUsersMessage';

export interface FailedToAddUsersMessageProps {
  isMessageFocused: boolean;
  message: FailedToAddUsersMessageEntity;
  userState?: UserState;
}

const errorMessageType = {
  [AddUsersFailureReasons.NON_FEDERATING_BACKENDS]: 'NonFederatingBackends',
  [AddUsersFailureReasons.UNREACHABLE_BACKENDS]: 'OfflineBackend',
} as const;

const config = Config.getConfig();

interface MessageDetailsProps {
  children: ReactNode;
  message: FailedToAddUsersMessageEntity;
  users: User[];
  domain?: string;
}
const MessageDetails: FC<MessageDetailsProps> = ({users, children, message, domain = ''}) => {
  return (
    <p
      data-uie-name="multi-user-not-added-details"
      data-uie-value={domain}
      style={{lineHeight: 'var(--line-height-sm)'}}
    >
      <span
        css={warning}
        dangerouslySetInnerHTML={{
          __html: t(`failedToAddParticipantsPluralDetails${errorMessageType[message.reason]}`, {
            name: users[0].name(),
            names: users
              .slice(1)
              .map(user => user.name())
              .join(', '),
            domain,
          }),
        }}
      />
      {children}
    </p>
  );
};

const FailedToAddUsersMessage: React.FC<FailedToAddUsersMessageProps> = ({
  isMessageFocused,
  message,
  userState = container.resolve(UserState),
}) => {
  const messageFocusedTabIndex = useMessageFocusedTabIndex(isMessageFocused);

  const [isOpen, setIsOpen] = useState(false);
  const {timestamp} = useKoSubscribableChildren(message, ['timestamp']);

  const {users: allUsers} = useKoSubscribableChildren(userState, ['users']);

  const [users, total, groupedUsers] = useMemo(() => {
    const users: User[] = message.qualifiedIds.reduce<User[]>((previous, current) => {
      const foundUser = allUsers.find(user => matchQualifiedIds(current, user.qualifiedId));
      return foundUser ? [...previous, foundUser] : previous;
    }, []);
    const groupedUsers = groupBy(users, user => user.domain);
    const total = users.length;
    return [users, total, groupedUsers];
  }, [allUsers, message.qualifiedIds]);

  if (users.length === 0) {
    return null;
  }

  const learnMore = (
    <>
      {' '}
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
    </>
  );

  return (
    <>
      <div className="message-header">
        <div className="message-header-icon message-header-icon--svg">
          <div className="svg-red">
            <Icon.Info />
          </div>
        </div>
        <div
          className="message-header-label"
          data-uie-name="element-message-failed-to-add-users"
          data-uie-value={total <= 1 ? '1-user-not-added' : 'multi-users-not-added'}
        >
          {total <= 1 && (
            <p data-uie-name="1-user-not-added-details" data-uie-value={users[0].id}>
              <span
                css={warning}
                dangerouslySetInnerHTML={{
                  __html: t(`failedToAddParticipantSingularOfflineBackend`, {
                    name: users[0].name(),
                    domain: users[0].domain,
                  }),
                }}
              />
              {learnMore}
            </p>
          )}
          {total > 1 && (
            <p
              css={warning}
              dangerouslySetInnerHTML={{
                __html: t(`failedToAddParticipantsPlural`, {total: total.toString()}),
              }}
            />
          )}
        </div>
        <p className="message-body-actions">
          <MessageTime
            timestamp={timestamp}
            data-uie-uid={message.id}
            data-uie-name="item-message-failed-to-add-users-timestamp"
          />
        </p>
      </div>
      <div className="message-body" style={{flexDirection: 'column'}}>
        {isOpen && (
          <>
            {message.reason === AddUsersFailureReasons.UNREACHABLE_BACKENDS && (
              <>
                {Object.entries(groupedUsers).map(([domain, domainUsers]) => (
                  <MessageDetails key={domain} domain={domain} message={message} users={domainUsers}>
                    {learnMore}
                  </MessageDetails>
                ))}
              </>
            )}
            {message.reason === AddUsersFailureReasons.NON_FEDERATING_BACKENDS && (
              <MessageDetails message={message} users={users}>
                {learnMore}
              </MessageDetails>
            )}
          </>
        )}
        {total > 1 && (
          <div>
            <Button
              tabIndex={messageFocusedTabIndex}
              data-uie-name="toggle-failed-to-add-users"
              type="button"
              variant={ButtonVariant.TERTIARY}
              onClick={() => setIsOpen(state => !state)}
              style={{marginTop: 4}}
            >
              {isOpen ? t('messageFailedToSendHideDetails') : t('messageFailedToSendShowDetails')}
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export {FailedToAddUsersMessage};
