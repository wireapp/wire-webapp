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

import {escape} from 'underscore';

import type {User} from 'Repositories/entity/User';

import {Declension} from './localizerUtil.types';
import type {Translate} from './translationTypes';

import {sortUsersByPriority} from '../stringUtil';

export function getSelfName(
  translation: Translate,
  declension = Declension.NOMINATIVE,
  bypassSanitization = false,
): string {
  const selfNameDeclensions = {
    [Declension.NOMINATIVE]: translation('conversationYouNominative'),
    [Declension.DATIVE]: translation('conversationYouDative'),
    [Declension.ACCUSATIVE]: translation('conversationYouAccusative'),
  };
  const selfName = selfNameDeclensions[declension];
  return bypassSanitization ? selfName : escape(selfName);
}

export function getUserName(
  userEntity: User,
  translation: Translate,
  declension?: string,
  bypassSanitization: boolean = false,
): string {
  if (userEntity.isMe) {
    return getSelfName(translation, declension, bypassSanitization);
  }
  return bypassSanitization ? userEntity.name() : escape(userEntity.name());
}

export function joinNames(
  userEntities: User[],
  translation: Translate,
  declension = Declension.ACCUSATIVE,
  skipAnd = false,
  boldNames = false,
): string {
  const containsSelfUser = userEntities.some(userEntity => userEntity.isMe);
  if (containsSelfUser) {
    userEntities = userEntities.filter(userEntity => !userEntity.isMe);
  }

  const userNames = userEntities.toSorted(sortUsersByPriority).map(userEntity => {
    const userName = userEntity.name();
    return boldNames ? `[bold]${userName}[/bold]` : userName;
  });

  if (containsSelfUser) {
    userNames.push(getSelfName(translation, declension, false));
  }

  const numberOfNames = userNames.length;
  const joinByAnd = !skipAnd && numberOfNames >= 2;
  if (joinByAnd) {
    const finalPairStartIndex = userNames.length - 2;
    const [secondLastName, lastName] = userNames.slice(finalPairStartIndex);
    const userNamesWithoutFinalPair = userNames.toSpliced(finalPairStartIndex, 2);

    const exactlyTwoNames = numberOfNames === 2;
    const additionalNames = exactlyTwoNames
      ? `${secondLastName} ${translation('and')} ${lastName}`
      : `${secondLastName}${translation('enumerationAnd')}${lastName}`;
    userNamesWithoutFinalPair.push(additionalNames);
    return userNamesWithoutFinalPair.join(', ');
  }

  return userNames.join(', ');
}
