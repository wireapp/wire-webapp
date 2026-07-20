/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {AddUsersFailure, AddUsersFailureReasons} from '@wireapp/core/lib/conversation';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {getUserNameWithTranslate} from 'Components/UserName';
import type {User} from 'Repositories/entity/User';
import type {Translate, TranslationKey} from 'Util/localizerUtil';
import {matchQualifiedIds} from 'Util/qualifiedId';

const singularTranslationKeyByReason = {
  [AddUsersFailureReasons.NON_FEDERATING_BACKENDS]: 'failedToAddParticipantSingularNonFederatingBackends',
  [AddUsersFailureReasons.UNREACHABLE_BACKENDS]: 'failedToAddParticipantSingularOfflineBackend',
  [AddUsersFailureReasons.OFFLINE_FOR_TOO_LONG]: 'failedToAddParticipantSingularOfflineForTooLong',
  [AddUsersFailureReasons.NOT_MLS_CAPABLE]: 'failedToAddParticipantSingularNotMlsCapable',
} as const satisfies Record<AddUsersFailureReasons, TranslationKey>;

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

const findUser = (users: User[], qualifiedId: QualifiedId): User | undefined =>
  users.find(user => matchQualifiedIds(qualifiedId, user.qualifiedId));

const getDisplayName = (users: User[], qualifiedId: QualifiedId, translate: Translate): string => {
  const user = findUser(users, qualifiedId);
  return user ? getUserNameWithTranslate(user, translate) : `${qualifiedId.id}@${qualifiedId.domain}`;
};

const getDomainStr = (failure: AddUsersFailure): string | undefined =>
  'backends' in failure ? Array.from(new Set(failure.backends)).join(', ') : undefined;

const formatFailureDetails = (failure: AddUsersFailure, users: User[], translate: Translate): string => {
  const failureUsers = failure.users
    .map(userId => findUser(users, userId))
    .filter((user): user is User => user !== undefined);

  if (failureUsers.length === 0) {
    return '';
  }

  const domainStr = getDomainStr(failure);

  if (failureUsers.length === 1) {
    const translationKey = singularDetailsTranslationKeyByReason[failure.reason];

    if (failure.reason === AddUsersFailureReasons.UNREACHABLE_BACKENDS) {
      return translate(translationKey, {
        name: getUserNameWithTranslate(failureUsers[0], translate),
        domain: domainStr ?? failureUsers[0].domain,
      });
    }

    return translate(translationKey, {
      name: getUserNameWithTranslate(failureUsers[0], translate),
    });
  }

  const translationKey = pluralDetailsTranslationKeyByReason[failure.reason];
  const replacements = {
    name: getUserNameWithTranslate(failureUsers[0], translate),
    names: failureUsers
      .slice(1)
      .map(user => getUserNameWithTranslate(user, translate))
      .join(', '),
  };

  if (failure.reason === AddUsersFailureReasons.UNREACHABLE_BACKENDS) {
    return translate(translationKey, {
      ...replacements,
      domain: domainStr ?? '',
    });
  }

  return translate(translationKey, replacements);
};

export const formatMeetingPartialAddFailureMessage = (
  failedToAdd: AddUsersFailure[],
  users: User[],
  translate: Translate,
): string => {
  const allUserIds = failedToAdd.flatMap(failure => failure.users);

  if (allUserIds.length === 0) {
    return '';
  }

  if (allUserIds.length === 1) {
    const qualifiedId = allUserIds[0];
    const failure = failedToAdd.find(currentFailure =>
      currentFailure.users.some(userId => matchQualifiedIds(userId, qualifiedId)),
    );

    if (!failure) {
      return '';
    }

    const translationKey = singularTranslationKeyByReason[failure.reason];
    const name = getDisplayName(users, qualifiedId, translate);
    const domainStr = getDomainStr(failure) ?? findUser(users, qualifiedId)?.domain ?? qualifiedId.domain;

    if (failure.reason === AddUsersFailureReasons.UNREACHABLE_BACKENDS) {
      return translate(translationKey, {name, domain: domainStr});
    }

    return translate(translationKey, {name});
  }

  const summary = translate('failedToAddParticipantsPlural', {total: allUserIds.length.toString()});
  const details = failedToAdd
    .map(failure => formatFailureDetails(failure, users, translate))
    .filter(detail => detail.length > 0);

  return [summary, ...details].join('<br/>');
};

type ShowMeetingPartialAddFailureModalParams = {
  failedToAdd: AddUsersFailure[];
  users: User[];
  translate: Translate;
};

export const showMeetingPartialAddFailureModal = ({
  failedToAdd,
  users,
  translate,
}: ShowMeetingPartialAddFailureModalParams): void => {
  if (failedToAdd.length === 0) {
    return;
  }

  const htmlMessage = formatMeetingPartialAddFailureMessage(failedToAdd, users, translate);

  if (htmlMessage.length === 0) {
    return;
  }

  setTimeout(() => {
    PrimaryModal.show(
      PrimaryModal.type.ACKNOWLEDGE,
      {
        text: {
          title: translate('meetings.scheduleModal.error.addParticipantsFailed'),
          htmlMessage,
        },
      },
      undefined,
      translate,
    );
  }, 0);
};
