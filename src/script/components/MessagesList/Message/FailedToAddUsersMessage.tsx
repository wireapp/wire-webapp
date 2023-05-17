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

import React, {useMemo, useState} from 'react';

import {container} from 'tsyringe';
import {groupBy} from 'underscore';

import {Button, ButtonVariant, COLOR_V2, Link, LinkVariant} from '@wireapp/react-ui-kit';

import {Icon} from 'Components/Icon';
import {Config} from 'src/script/Config';
import {User} from 'src/script/entity/User';
import {UserState} from 'src/script/user/UserState';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';

import {warning} from './ContentMessage/Warnings/Warnings.styles';
import {MessageTime} from './MessageTime';

import {FailedToAddUsersMessage as FailedToAddUsersMessageEntity} from '../../../entity/message/FailedToAddUsersMessage';

export interface FailedToAddUsersMessageProps {
  message: FailedToAddUsersMessageEntity;
  userState?: UserState;
}

const FailedToAddUsersMessage: React.FC<FailedToAddUsersMessageProps> = ({
  message,
  userState = container.resolve(UserState),
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const {timestamp} = useKoSubscribableChildren(message, ['timestamp']);
  const config = Config.getConfig();

  const {users: allUsers} = useKoSubscribableChildren(userState, ['users']);

  const [users, total, groupedUsers] = useMemo(() => {
    const users: User[] = message.qualifiedIds.reduce<User[]>((previous, current) => {
      const foundUser = allUsers.find(user => matchQualifiedIds(current, user.qualifiedId));
      if (foundUser) {
        return [...previous, foundUser];
      }
      return previous;
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
        targetBlank
        variant={LinkVariant.PRIMARY}
        href={config.URL.SUPPORT.CONTACT}
        data-uie-name="go-contact-support"
        style={{
          color: COLOR_V2.BLUE_LIGHT_500,
          fontSize: '0.75rem',
          fontWeight: 600,
          textDecoration: 'underline',
          textTransform: 'none',
        }}
      >
        {t('failedToAddParticipantsLearnMore')}
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
          <p
            css={warning}
            dangerouslySetInnerHTML={{
              __html:
                total <= 1 ? t('failedToAddParticipant') : t('failedToAddParticipants', {total: total.toString()}),
            }}
          />
        </div>
        <p className="message-body-actions">
          <MessageTime
            timestamp={timestamp}
            data-uie-uid={message.id}
            data-uie-name="item-message-failed-to-add-users-timestamp"
          />
        </p>
      </div>
      <div className="message-body">
        {isOpen && (
          <>
            {total <= 1 && (
              <p data-uie-name="1-user-not-added-details" data-uie-value={users[0].id}>
                <span
                  css={warning}
                  dangerouslySetInnerHTML={{
                    __html: t('failedToAddParticipantDetails', {name: users[0].name(), domain: users[0].domain}),
                  }}
                />
                {learnMore}
              </p>
            )}
            {total > 1 &&
              Object.entries(groupedUsers).map(([domain, domainUsers]) => (
                <p key={domain} data-uie-name="multi-user-not-added-details" data-uie-value={domain}>
                  <span
                    css={warning}
                    dangerouslySetInnerHTML={{
                      __html: t('failedToAddParticipantsDetails', {
                        name: domainUsers[domainUsers.length - 1].name(),
                        names:
                          domainUsers.length === 2
                            ? domainUsers[0].name()
                            : domainUsers.map(user => user.name()).join(', '),
                        domain,
                      }),
                    }}
                  />
                  {learnMore}
                </p>
              ))}
          </>
        )}
        <Button
          data-uie-name="toggle-failed-to-add-users"
          type="button"
          variant={ButtonVariant.TERTIARY}
          onClick={() => setIsOpen(state => !state)}
        >
          {isOpen ? t('messageFailedToSendHideDetails') : t('messageFailedToSendShowDetails')}
        </Button>
      </div>
    </>
  );
};

export {FailedToAddUsersMessage};
