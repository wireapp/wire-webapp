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
import type {ReactNode} from 'react';

import {isUndefined} from '@sindresorhus/is';
import {AddUsersFailure, AddUsersFailureReasons} from '@wireapp/core/lib/conversation';
import {container} from 'tsyringe';

import {Button, ButtonVariant, Link, LinkVariant} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/icon';
import {getUserNameWithTranslate} from 'Components/UserName';
import {FailedToAddUsersMessage as FailedToAddUsersMessageEntity} from 'Repositories/entity/message/failedToAddUsersMessage';
import {User} from 'Repositories/entity/User';
import {UserState} from 'Repositories/user/userState';
import {Config} from 'src/script/Config';
import {reactTranslationRenderingFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {useKoSubscribableChildren} from 'Util/componentUtil';
import type {Translate, TranslationKey} from 'Util/localizerUtil';
import {createReactTranslationMarker, renderReactTranslation} from 'Util/localizerUtil/reactLocalizerUtil';
import type {ReactTranslationMarker} from 'Util/localizerUtil/reactLocalizerUtil';
import {matchQualifiedIds} from 'Util/qualifiedId';

import {backendErrorLink, warning} from './contentMessage/warnings/warnings.styles';
import {MessageTime} from './messageTime';
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
    link: {url: config.URL.SUPPORT.MLS_LEARN_MORE, name: 'mls-learn-more'},
    translationLabel: 'NotMlsCapable',
  },
} as const;

interface MessageDetailsProps {
  failure: AddUsersFailure;
  isMessageFocused: boolean;
  allUsers: User[];
  translate: (translationKey: TranslationKey, replacements?: Record<string, string>) => string;
}

const singularDetailsTranslationKeyByReason = {
  [AddUsersFailureReasons.NON_FEDERATING_BACKENDS]: 'failedToAddParticipantsSingularDetailsNonFederatingBackends',
  [AddUsersFailureReasons.UNREACHABLE_BACKENDS]: 'failedToAddParticipantsSingularDetailsOfflineBackend',
  [AddUsersFailureReasons.OFFLINE_FOR_TOO_LONG]: 'failedToAddParticipantsSingularDetailsOfflineForTooLong',
  [AddUsersFailureReasons.NOT_MLS_CAPABLE]: 'failedToAddParticipantsSingularDetailsNotMlsCapable',
} as const satisfies Record<AddUsersFailureReasons, TranslationKey>;

const pluralDetailsTranslationKeyByReason = {
  [AddUsersFailureReasons.NON_FEDERATING_BACKENDS]: 'failedToAddParticipantsPluralDetailsNonFederatingBackends',
  [AddUsersFailureReasons.UNREACHABLE_BACKENDS]: 'failedToAddParticipantsPluralDetailsOfflineBackend',
  [AddUsersFailureReasons.OFFLINE_FOR_TOO_LONG]: 'failedToAddParticipantsPluralDetailsOfflineForTooLong',
  [AddUsersFailureReasons.NOT_MLS_CAPABLE]: 'failedToAddParticipantsPluralDetailsNotMlsCapable',
} as const satisfies Record<AddUsersFailureReasons, TranslationKey>;

const singularTranslationKeyByReason = {
  [AddUsersFailureReasons.NON_FEDERATING_BACKENDS]: 'failedToAddParticipantSingularNonFederatingBackends',
  [AddUsersFailureReasons.UNREACHABLE_BACKENDS]: 'failedToAddParticipantSingularOfflineBackend',
  [AddUsersFailureReasons.OFFLINE_FOR_TOO_LONG]: 'failedToAddParticipantSingularOfflineForTooLong',
  [AddUsersFailureReasons.NOT_MLS_CAPABLE]: 'failedToAddParticipantSingularNotMlsCapable',
} as const satisfies Record<AddUsersFailureReasons, TranslationKey>;

type FailedToAddTranslationPlaceholder = 'name' | 'names' | 'domain' | 'total';

type FailedToAddTranslationValue = {
  readonly placeholder: FailedToAddTranslationPlaceholder;
  readonly marker: ReactTranslationMarker;
  readonly runtimeText: string;
};

type RenderFailedToAddTranslationOptions = {
  readonly translate: Translate;
  readonly translationKey: TranslationKey;
  readonly values: readonly FailedToAddTranslationValue[];
};

const failedToAddBoldMarker = createReactTranslationMarker('failed-to-add-bold');
const failedToAddNameMarker = createReactTranslationMarker('failed-to-add-name');
const failedToAddNamesMarker = createReactTranslationMarker('failed-to-add-names');
const failedToAddDomainMarker = createReactTranslationMarker('failed-to-add-domain');
const failedToAddTotalMarker = createReactTranslationMarker('failed-to-add-total');

const failedToAddReactTranslationFormatting = {
  '/bold': failedToAddBoldMarker.end,
  bold: failedToAddBoldMarker.start,
};

function getFailedToAddMarkerSubstitutions(values: readonly FailedToAddTranslationValue[]): Record<string, string> {
  return Object.fromEntries(values.map(({placeholder, marker}) => [placeholder, marker.substitution]));
}

function getFailedToAddRuntimeSubstitutions(values: readonly FailedToAddTranslationValue[]): Record<string, string> {
  return Object.fromEntries(values.map(({placeholder, runtimeText}) => [placeholder, runtimeText]));
}

function translateFailedToAddTranslation(options: RenderFailedToAddTranslationOptions): string {
  const {translate, translationKey, values} = options;
  return translate(translationKey, getFailedToAddRuntimeSubstitutions(values));
}

function applyFailedToAddTranslationCompatibility(translationKey: TranslationKey, translatedText: string): string {
  if (translationKey !== 'failedToAddParticipantsPluralDetailsOfflineForTooLong') {
    return translatedText;
  }

  const malformedNamesRegion = `${failedToAddBoldMarker.end}${failedToAddNamesMarker.substitution}${failedToAddBoldMarker.end}`;
  return translatedText.replace(malformedNamesRegion, failedToAddNamesMarker.substitution);
}

function renderFailedToAddReactTranslation(options: RenderFailedToAddTranslationOptions): ReactNode[] {
  const {translate, translationKey, values} = options;
  const translatedText = applyFailedToAddTranslationCompatibility(
    translationKey,
    translate(translationKey, getFailedToAddMarkerSubstitutions(values), failedToAddReactTranslationFormatting),
  );

  return renderReactTranslation({
    translatedText,
    componentReplacements: [
      {
        start: failedToAddBoldMarker.start,
        end: failedToAddBoldMarker.end,
        render(children): ReactNode {
          return <strong>{children}</strong>;
        },
      },
    ],
    nodeReplacements: [],
    valueReplacements: values.map(({marker, runtimeText}) => ({marker, runtimeText})),
  });
}

type RenderFailedToAddSingleUserSummaryOptions = {
  readonly firstUser: User | undefined;
  readonly failure: AddUsersFailure;
  readonly isReactTranslationRenderingEnabled: boolean;
  readonly learnMore: ReactNode;
  readonly totalNumberOfUsers: number;
  readonly translate: Translate;
};

function renderFailedToAddSingleUserSummary(options: RenderFailedToAddSingleUserSummaryOptions): ReactNode {
  const {failure, firstUser, isReactTranslationRenderingEnabled, learnMore, totalNumberOfUsers, translate} = options;

  if (totalNumberOfUsers > 1 || isUndefined(firstUser)) {
    return null;
  }

  const runtimeUserName = getUserNameWithTranslate(firstUser, translate);
  const translationKey = singularTranslationKeyByReason[failure.reason];
  let translationContent: ReactNode;

  if (isReactTranslationRenderingEnabled === true) {
    if (reasonToMessageDataMap[failure.reason].translationLabel === 'OfflineBackend') {
      translationContent = (
        <span css={warning}>
          {renderFailedToAddReactTranslation({
            translate,
            translationKey,
            values: [
              {
                placeholder: 'name',
                marker: failedToAddNameMarker,
                runtimeText: runtimeUserName,
              },
              {
                placeholder: 'domain',
                marker: failedToAddDomainMarker,
                runtimeText: firstUser.domain,
              },
            ],
          })}
        </span>
      );
    } else {
      translationContent = (
        <span css={warning}>
          {renderFailedToAddReactTranslation({
            translate,
            translationKey,
            values: [
              {
                placeholder: 'name',
                marker: failedToAddNameMarker,
                runtimeText: runtimeUserName,
              },
            ],
          })}
        </span>
      );
    }
  } else {
    translationContent = (
      <span
        css={warning}
        dangerouslySetInnerHTML={{
          __html: translateFailedToAddTranslation({
            translate,
            translationKey,
            values: [
              {
                placeholder: 'name',
                marker: failedToAddNameMarker,
                runtimeText: runtimeUserName,
              },
              {
                placeholder: 'domain',
                marker: failedToAddDomainMarker,
                runtimeText: firstUser.domain,
              },
            ],
          }),
        }}
      />
    );
  }

  return (
    <p data-uie-name="1-user-not-added-details" data-uie-value={firstUser.id}>
      {translationContent}
      {learnMore}
    </p>
  );
}

type RenderFailedToAddPluralSummaryOptions = {
  readonly isReactTranslationRenderingEnabled: boolean;
  readonly totalNumberOfUsers: number;
  readonly translate: Translate;
};

function renderFailedToAddPluralSummary(options: RenderFailedToAddPluralSummaryOptions): ReactNode {
  const {isReactTranslationRenderingEnabled, totalNumberOfUsers, translate} = options;

  if (totalNumberOfUsers <= 1) {
    return null;
  }

  const values = [
    {
      placeholder: 'total' as const,
      marker: failedToAddTotalMarker,
      runtimeText: totalNumberOfUsers.toString(),
    },
  ];

  if (isReactTranslationRenderingEnabled === true) {
    return (
      <p css={warning}>
        {renderFailedToAddReactTranslation({
          translate,
          translationKey: 'failedToAddParticipantsPlural',
          values,
        })}
      </p>
    );
  }

  return (
    <p
      css={warning}
      dangerouslySetInnerHTML={{
        __html: translateFailedToAddTranslation({
          translate,
          translationKey: 'failedToAddParticipantsPlural',
          values,
        }),
      }}
    />
  );
}

function MessageDetails({failure, isMessageFocused, allUsers, translate}: MessageDetailsProps): ReactNode {
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
        {translate('offlineBackendLearnMore')}
      </Link>
    </>
  );

  function getText(): string {
    if (baseTranslationKey === 'failedToAddParticipantsSingularDetails') {
      if (translationLabel === 'OfflineBackend') {
        return translate(singularDetailsTranslationKeyByReason[reason], {
          name: getUserNameWithTranslate(users[0], translate),
          domain: domainStr as string,
        });
      }

      return translate(singularDetailsTranslationKeyByReason[reason], {
        name: getUserNameWithTranslate(users[0], translate),
      });
    }

    if (baseTranslationKey === 'failedToAddParticipantsPluralDetails') {
      if (translationLabel === 'OfflineBackend') {
        return translate(pluralDetailsTranslationKeyByReason[reason], {
          name: getUserNameWithTranslate(users[0], translate),
          names: users
            .slice(1)
            .map(user => getUserNameWithTranslate(user, translate))
            .join(', '),
          domain: domainStr as string,
        });
      }

      return translate(pluralDetailsTranslationKeyByReason[reason], {
        name: getUserNameWithTranslate(users[0], translate),
        names: users
          .slice(1)
          .map(user => getUserNameWithTranslate(user, translate))
          .join(', '),
      });
    }

    return '';
  }

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
}

function FailedToAddUsersMessage({
  isMessageFocused,
  message,
  userState = container.resolve(UserState),
}: FailedToAddUsersMessageProps): ReactNode {
  const {isFeatureToggleEnabled, translate} = useApplicationContext();
  const isReactTranslationRenderingEnabled = isFeatureToggleEnabled(reactTranslationRenderingFeatureToggleName);
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
  const {link} = reasonToMessageDataMap[failures[0].reason];

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
        {translate('offlineBackendLearnMore')}
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
          {renderFailedToAddSingleUserSummary({
            failure: failures[0],
            firstUser,
            isReactTranslationRenderingEnabled,
            learnMore,
            totalNumberOfUsers,
            translate,
          })}
          {renderFailedToAddPluralSummary({
            isReactTranslationRenderingEnabled,
            totalNumberOfUsers,
            translate,
          })}
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
            <MessageDetails
              allUsers={allUsers}
              isMessageFocused={isMessageFocused}
              key={index}
              failure={failure}
              translate={translate}
            />
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
              {isOpen ? translate('messageFailedToSendHideDetails') : translate('messageFailedToSendShowDetails')}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

export {FailedToAddUsersMessage};
