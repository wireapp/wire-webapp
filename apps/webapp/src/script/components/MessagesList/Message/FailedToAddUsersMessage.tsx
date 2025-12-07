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

import {useMemo, useState} from 'react';

import {AddUsersFailure, AddUsersFailureReasons} from '@wireapp/core/lib/conversation';
import * as Icon from 'Components/Icon';
import {getUserName} from 'Components/UserName';
import {FailedToAddUsersMessage as FailedToAddUsersMessageEntity} from 'Repositories/entity/message/FailedToAddUsersMessage';
import {User} from 'Repositories/entity/User';
import {UserState} from 'Repositories/user/UserState';
import {Config} from 'src/script/Config';
import {container} from 'tsyringe';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';

import {Button, ButtonVariant, Link, LinkVariant} from '@wireapp/react-ui-kit';

import {backendErrorLink, warning} from './ContentMessage/Warnings/Warnings.styles';
import {MessageTime} from './MessageTime';
import {useMessageFocusedTabIndex} from './util';

interface FailedToAddUsersMessageProps {
  isMessageFocused: boolean;
  message: FailedToAddUsersMessageEntity;
  userState?: UserState;
}

const config = Config.getConfig();

const reasonToMessageDataMap = {
  [AddUsersFailureReasons.NON_FEDERATING_BACKENDS]: {
    link: {
      url: config.URL.SUPPORT.OFFLINE_BACKEND,
      name: 'go-offline-backend',
    },
    translationLabel: 'NonFederatingBackends',
  },
  [AddUsersFailureReasons.UNREACHABLE_BACKENDS]: {
    link: {url: config.URL.SUPPORT.OFFLINE_BACKEND, name: 'go-offline-backend'},
    translationLabel: 'OfflineBackend',
  },
  [AddUsersFailureReasons.OFFLINE_FOR_TOO_LONG]: {
    link: {url: config.URL.SUPPORT.OFFLINE_BACKEND, name: 'go-offline-backend'},
    translationLabel: 'OfflineForTooLong',
  },
  [AddUsersFailureReasons.NOT_MLS_CAPABLE]: {
    link: {url: config.URL.SUPPORT.MLS_MIGRATION_FROM_PROTEUS, name: 'mls-learn-more'},
    translationLabel: 'NotMlsCapable',
  },
} as const;

interface MessageDetailsProps {
  failure: AddUsersFailure;
  isMessageFocused: boolean;
  allUsers: User[];
}

const MessageDetails = ({failure, isMessageFocused, allUsers}: MessageDetailsProps) => {
  const messageFocusedTabIndex = useMessageFocusedTabIndex(isMessageFocused);

  const {users: userIds, reason} = failure;

  const users = useMemo(() => {
    const users: User[] = userIds.reduce<User[]>((previous, current) => {
      const foundUser = allUsers.find(user => matchQualifiedIds(current, user.qualifiedId));
      return foundUser ? [...previous, foundUser] : previous;
    }, []);
    return users;
  }, [allUsers, userIds]);

  const baseTranslationKey =
    users.length === 1 ? 'failedToAddParticipantsSingularDetails' : 'failedToAddParticipantsPluralDetails';

  const uniqueDomains = 'backends' in failure ? Array.from(new Set(failure.backends)) : undefined;
  const domainStr = uniqueDomains && uniqueDomains.join(', ');

  const {link, translationLabel} = reasonToMessageDataMap[reason];

  const learnMoreLink = (
    <>
      {' '}
      <Link
        tabIndex={messageFocusedTabIndex}
        targetBlank
        variant={LinkVariant.PRIMARY}
        href={link.url}
        data-uie-name={link.name}
        css={backendErrorLink}
      >
        {t('offlineBackendLearnMore')}
      </Link>
    </>
  );

  const getText = (): string => {
    if (baseTranslationKey === 'failedToAddParticipantsSingularDetails') {
      if (translationLabel === 'OfflineBackend') {
        return t(`failedToAddParticipantsSingularDetailsOfflineBackend`, {
          name: getUserName(users[0]),
          domain: domainStr as string,
        });
      }

      return t(`failedToAddParticipantsSingularDetails${translationLabel}`, {
        name: getUserName(users[0]),
      });
    }

    if (baseTranslationKey === 'failedToAddParticipantsPluralDetails') {
      if (translationLabel === 'OfflineBackend') {
        return t(`failedToAddParticipantsPluralDetailsOfflineBackend`, {
          name: getUserName(users[0]),
          names: users
            .slice(1)
            .map(user => getUserName(user))
            .join(', '),
          domain: domainStr as string,
        });
      }

      return t(`failedToAddParticipantsPluralDetails${translationLabel}`, {
        name: getUserName(users[0]),
        names: users
          .slice(1)
          .map(user => getUserName(user))
          .join(', '),
      });
    }

    return '';
  };

  const text = getText();

  return (
    <p data-uie-name="multi-user-not-added-details" data-uie-value={domainStr}>
      {text && (
        <span
          css={warning}
          dangerouslySetInnerHTML={{
            __html: text,
          }}
        />
      )}
      {learnMoreLink}
    </p>
  );
};

const FailedToAddUsersMessage = ({
  isMessageFocused,
  message,
  userState = container.resolve(UserState),
}: FailedToAddUsersMessageProps) => {
  const messageFocusedTabIndex = useMessageFocusedTabIndex(isMessageFocused);

  const [isOpen, setIsOpen] = useState(false);
  const {timestamp} = useKoSubscribableChildren(message, ['timestamp']);

  const {users: allUsers} = useKoSubscribableChildren(userState, ['users']);
  const {failures} = message;

  const allUserIds = useMemo(() => failures.flatMap(failure => failure.users), [failures]);
  const totalNumberOfUsers = allUserIds.length;

  if (allUserIds.length === 0) {
    return null;
  }

  // These will be used if we've only failed to add a single user
  const firstUser = allUsers.find(user => matchQualifiedIds(allUserIds[0], user.qualifiedId));
  const {link, translationLabel} = reasonToMessageDataMap[failures[0].reason];

  const learnMore = (
    <>
      {' '}
      <Link
        tabIndex={messageFocusedTabIndex}
        targetBlank
        variant={LinkVariant.PRIMARY}
        href={link.url}
        data-uie-name={link.name}
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
            <Icon.InfoIcon />
          </div>
        </div>
        <div
          className="message-header-label"
          data-uie-name="element-message-failed-to-add-users"
          data-uie-value={totalNumberOfUsers <= 1 ? '1-user-not-added' : 'multi-users-not-added'}
        >
          {totalNumberOfUsers <= 1 && firstUser && (
            <p data-uie-name="1-user-not-added-details" data-uie-value={firstUser.id}>
              <span
                css={warning}
                dangerouslySetInnerHTML={{
                  __html: t(`failedToAddParticipantSingular${translationLabel}`, {
                    name: getUserName(firstUser),
                    domain: firstUser.domain,
                  }),
                }}
              />
              {learnMore}
            </p>
          )}
          {totalNumberOfUsers > 1 && (
            <p
              css={warning}
              dangerouslySetInnerHTML={{
                __html: t(`failedToAddParticipantsPlural`, {total: totalNumberOfUsers.toString()}),
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
      <div className="message-details">
        {isOpen &&
          failures.map((failure, index) => (
            <MessageDetails allUsers={allUsers} isMessageFocused={isMessageFocused} key={index} failure={failure} />
          ))}

        {totalNumberOfUsers > 1 && (
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
