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

import {escape} from 'underscore';

import en from 'I18n/en-US.json';
import type {User} from 'Repositories/entity/User';

import {Declension} from './LocalizerUtil.types';

import {sortUsersByPriority} from '../StringUtil';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ExtractSubstitutionKeys<Value extends string> = Value extends `${infer Start}{${infer Key}}${infer Rest}`
  ? Key | ExtractSubstitutionKeys<Rest>
  : never;

export type TranslationStrings = typeof en;

type SubstitutionsFor<Id extends string> = {
  [Key in ExtractSubstitutionKeys<Id>]: string | number;
};

type Substitutions<Id extends StringIdentifer> = SubstitutionsFor<TranslationStrings[Id]>;

export type StringIdentifer = keyof TranslationStrings;

export const DEFAULT_LOCALE = 'en';

let locale = DEFAULT_LOCALE;
let strings: Record<string, Record<string, string>> = {};

export const getSelfName = (declension = Declension.NOMINATIVE, bypassSanitization = false) => {
  const selfNameDeclensions = {
    [Declension.NOMINATIVE]: t('conversationYouNominative'),
    [Declension.DATIVE]: t('conversationYouDative'),
    [Declension.ACCUSATIVE]: t('conversationYouAccusative'),
  };
  const selfName = selfNameDeclensions[declension];
  return bypassSanitization ? selfName : escape(selfName);
};

export const getUserName = (userEntity: User, declension?: string, bypassSanitization: boolean = false): string => {
  if (userEntity.isMe) {
    return getSelfName(declension, bypassSanitization);
  }
  return bypassSanitization ? userEntity.name() : escape(userEntity.name());
};

const isStringOrNumber = (toTest: any): toTest is string | number =>
  typeof toTest === 'string' || typeof toTest === 'number';

const replaceSubstituteEscaped = <Id extends StringIdentifer>(
  string: string,
  regex: RegExp | string,
  substitutes?: Substitutions<Id> | Record<string, string>,
): string => {
  if (isStringOrNumber(substitutes)) {
    return string.replace(regex, escape(substitutes.toString()));
  }
  return string.replace(regex, (found: string, content: Id | string): string =>
    substitutes?.hasOwnProperty(content) ? escape(substitutes[content] as string) : found,
  );
};

const replaceSubstitute = <Id extends StringIdentifer>(
  string: string,
  regex: RegExp | string,
  substitutes?: Substitutions<Id> | Record<string, string>,
): string => {
  if (isStringOrNumber(substitutes)) {
    return string.replace(regex, substitutes.toString());
  }
  return string.replace(regex, (found: string, content: Id | string) => {
    return substitutes?.hasOwnProperty(content) ? (substitutes[content] as string) : found;
  });
};

export const LocalizerUtil = {
  joinNames: (userEntities: User[], declension = Declension.ACCUSATIVE, skipAnd = false, boldNames = false) => {
    const containsSelfUser = userEntities.some(userEntity => userEntity.isMe);
    if (containsSelfUser) {
      userEntities = userEntities.filter(userEntity => !userEntity.isMe);
    }

    const userNames = userEntities.sort(sortUsersByPriority).map(userEntity => {
      const userName = userEntity.name();
      return boldNames ? `[bold]${userName}[/bold]` : userName;
    });

    if (containsSelfUser) {
      userNames.push(getSelfName(declension));
    }

    const numberOfNames = userNames.length;
    const joinByAnd = !skipAnd && numberOfNames >= 2;
    if (joinByAnd) {
      const [secondLastName, lastName] = userNames.splice(userNames.length - 2, 2);

      const exactlyTwoNames = numberOfNames === 2;
      const additionalNames = exactlyTwoNames
        ? `${secondLastName} ${t('and')} ${lastName}`
        : `${secondLastName}${t('enumerationAnd')}${lastName}`;
      userNames.push(additionalNames);
    }

    return userNames.join(', ');
  },

  translate: <Id extends StringIdentifer>(
    identifier: Id,
    ...args: ExtractSubstitutionKeys<TranslationStrings[Id]> extends never
      ? [substitutions?: undefined, dangerousSubstitutions?: Record<string, string>, skipEscape?: boolean]
      : [substitutions?: Substitutions<Id>, dangerousSubstitutions?: Record<string, string>, skipEscape?: boolean]
  ): string => {
    const localeValue = strings[locale] && strings[locale][identifier];
    const defaultValue =
      strings[DEFAULT_LOCALE] && strings[DEFAULT_LOCALE].hasOwnProperty(identifier)
        ? strings[DEFAULT_LOCALE][identifier]
        : identifier;
    const value = localeValue || defaultValue;

    const [substitutions, dangerousSubstitutions, skipEscape] = args;

    const replaceDangerously = {
      '/bold': '</strong>',
      '/italic': '</i>',
      bold: '<strong>',
      italic: '<i>',
      ...dangerousSubstitutions,
    };

    const substitutedEscaped = skipEscape
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

export const t = <Id extends StringIdentifer>(
  identifier: Id,
  ...args: ExtractSubstitutionKeys<TranslationStrings[Id]> extends never
    ? [substitutions?: undefined, dangerousSubstitutions?: Record<string, string>, skipEscape?: boolean]
    : [substitutions: Substitutions<Id>, dangerousSubstitutions?: Record<string, string>, skipEscape?: boolean]
): string => {
  return LocalizerUtil.translate(identifier, ...args);
};

export const joinNames = LocalizerUtil.joinNames;

export const replaceLink = (href: string, className: string = '', uieName: string = '') => ({
  '/link': '</a>',
  link: `<a href="${href}" data-uie-name="${uieName}" class="${className}" rel="nofollow noopener noreferrer" target="_blank">`,
});
