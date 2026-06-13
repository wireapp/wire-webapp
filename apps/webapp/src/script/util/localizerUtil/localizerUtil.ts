/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import is from '@sindresorhus/is';
import {escape} from 'underscore';

import en from 'I18n/en-US.json';
import type {User} from 'Repositories/entity/User';

import {Declension} from './localizerUtil.types';

import {sortUsersByPriority} from '../stringUtil';

export type TranslationStrings = typeof en;
export type TranslationKey = keyof TranslationStrings;
export type StringIdentifer = TranslationKey;

type TranslationSubstitutions = Record<string, string | number>;
export type Substitutions = TranslationSubstitutions;

export const DEFAULT_LOCALE = 'en';

let locale = DEFAULT_LOCALE;
let strings: Record<string, Record<string, string>> = {};

export function translate<Id extends TranslationKey>(
  identifier: Id,
  substitutions?: TranslationSubstitutions,
  dangerousSubstitutions?: Record<string, string>,
  skipEscape?: boolean,
): string {
  return LocalizerUtil.translate(identifier, substitutions, dangerousSubstitutions, skipEscape);
}

export const getSelfName = (
  declension = Declension.NOMINATIVE,
  bypassSanitization = false,
  translation = translate,
) => {
  const selfNameDeclensions = {
    [Declension.NOMINATIVE]: translation('conversationYouNominative'),
    [Declension.DATIVE]: translation('conversationYouDative'),
    [Declension.ACCUSATIVE]: translation('conversationYouAccusative'),
  };
  const selfName = selfNameDeclensions[declension];
  return bypassSanitization ? selfName : escape(selfName);
};

export const getUserName = (
  userEntity: User,
  declension?: string,
  bypassSanitization: boolean = false,
  translation = translate,
): string => {
  if (userEntity.isMe) {
    return getSelfName(declension, bypassSanitization, translation);
  }
  return bypassSanitization ? userEntity.name() : escape(userEntity.name());
};

const isStringOrNumber = (toTest: any): toTest is string | number =>
  typeof toTest === 'string' || typeof toTest === 'number';

const replaceSubstituteEscaped = (
  string: string,
  regex: RegExp | string,
  substitutes?: TranslationSubstitutions | Record<string, string>,
): string => {
  if (isStringOrNumber(substitutes)) {
    return string.replace(regex, escape(substitutes.toString()));
  }
  return string.replace(regex, (found: string, content: string): string => {
    if (substitutes !== undefined && Object.hasOwn(substitutes, content)) {
      return escape(substitutes[content] as string);
    }
    return found;
  });
};

const replaceSubstitute = (
  string: string,
  regex: RegExp | string,
  substitutes?: TranslationSubstitutions | Record<string, string>,
): string => {
  if (isStringOrNumber(substitutes)) {
    return string.replace(regex, substitutes.toString());
  }
  return string.replace(regex, (found: string, content: string) => {
    if (substitutes !== undefined && Object.hasOwn(substitutes, content)) {
      return substitutes[content] as string;
    }
    return found;
  });
};

export const LocalizerUtil = {
  joinNames: (
    userEntities: User[],
    declension = Declension.ACCUSATIVE,
    skipAnd = false,
    boldNames = false,
    translation = translate,
  ) => {
    const containsSelfUser = userEntities.some(userEntity => userEntity.isMe);
    if (containsSelfUser) {
      userEntities = userEntities.filter(userEntity => !userEntity.isMe);
    }

    const userNames = userEntities.toSorted(sortUsersByPriority).map(userEntity => {
      const userName = userEntity.name();
      return boldNames ? `[bold]${userName}[/bold]` : userName;
    });

    if (containsSelfUser) {
      userNames.push(getSelfName(declension, false, translation));
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
  },

  translate: <Id extends TranslationKey>(
    identifier: Id,
    substitutions?: TranslationSubstitutions,
    dangerousSubstitutions?: Record<string, string>,
    skipEscape?: boolean,
  ): string => {
    const localeValue = strings[locale]?.[identifier];
    const defaultValue =
      strings[DEFAULT_LOCALE] !== undefined && Object.hasOwn(strings[DEFAULT_LOCALE], identifier)
        ? strings[DEFAULT_LOCALE][identifier]
        : identifier;
    const value = is.string(localeValue) ? localeValue : defaultValue;

    const replaceDangerously = {
      '/bold': '</strong>',
      '/italic': '</i>',
      bold: '<strong>',
      italic: '<i>',
      ...dangerousSubstitutions,
    };

    const substitutedEscaped =
      skipEscape === true
        ? replaceSubstitute(value, /{(.+?)}/g, substitutions)
        : replaceSubstituteEscaped(value, /{(.+?)}/g, substitutions);

    return replaceSubstitute(substitutedEscaped, /\[(.+?)\]/g, replaceDangerously);
  },
};

export const setLocale = (newLocale: string): void => {
  locale = newLocale;
};

export const setStrings = (newStrings: typeof strings): void => {
  strings = newStrings;
};

export const joinNames = LocalizerUtil.joinNames;

export const replaceLink = (href: string, className: string = '', uieName: string = '') => ({
  '/link': '</a>',
  link: `<a href="${href}" data-uie-name="${uieName}" class="${className}" rel="nofollow noopener noreferrer" target="_blank">`,
});
