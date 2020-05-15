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

import type {User} from '../entity/User';
import {getSelfName} from './SanitizationUtil';
import {sortUsersByPriority} from './StringUtil';

type Substitutes = Record<string, string> | string | number;

export const DEFAULT_LOCALE = 'en';

let locale = DEFAULT_LOCALE;
let strings: Record<string, Record<string, string>> = {};

const isStringOrNumber = (toTest: any): toTest is string | number =>
  typeof toTest === 'string' || typeof toTest === 'number';

const replaceSubstituteEscaped = (string: string, regex: RegExp | string, substitutes: Substitutes): string => {
  if (isStringOrNumber(substitutes)) {
    return string.replace(regex, escape(substitutes.toString()));
  }
  return string.replace(regex, (found: string, content: string): string =>
    substitutes.hasOwnProperty(content) ? escape(substitutes[content]) : found,
  );
};

const replaceSubstitute = (string: string, regex: RegExp | string, substitutes: Substitutes): string => {
  if (isStringOrNumber(substitutes)) {
    return string.replace(regex, substitutes.toString());
  }
  return string.replace(regex, (found: string, content: string): string =>
    substitutes.hasOwnProperty(content) ? substitutes[content] : found,
  );
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

  translate: (
    identifier: string,
    substitutions: Substitutes = {},
    dangerousSubstitutions: Record<string, string> = {},
    skipEscape: boolean = false,
  ): string => {
    const localeValue = strings[locale] && strings[locale][identifier];
    const defaultValue =
      strings[DEFAULT_LOCALE] && strings[DEFAULT_LOCALE].hasOwnProperty(identifier)
        ? strings[DEFAULT_LOCALE][identifier]
        : identifier;
    const value = localeValue || defaultValue;

    const replaceDangerously = {
      '/bold': '</strong>',
      '/italic': '</i>',
      bold: '<strong>',
      italic: '<i>',
      ...dangerousSubstitutions,
    };

    const substitutedEscaped = skipEscape
      ? replaceSubstitute(value, /{{(.+?)}}/g, substitutions)
      : replaceSubstituteEscaped(value, /{{(.+?)}}/g, substitutions);

    return replaceSubstitute(substitutedEscaped, /\[(.+?)\]/g, replaceDangerously);
  },
};

export const Declension = {
  ACCUSATIVE: 'accusative',
  DATIVE: 'dative',
  NOMINATIVE: 'nominative',
};

export const setLocale = (newLocale: string): void => {
  locale = newLocale;
};

export const setStrings = (newStrings: typeof strings): void => {
  strings = newStrings;
};

export function t(
  identifier: string,
  substitutions?: Substitutes,
  dangerousSubstitutions?: Record<string, string>,
  skipEscape: boolean = false,
): string {
  return LocalizerUtil.translate(identifier, substitutions, dangerousSubstitutions, skipEscape);
}

export const joinNames = LocalizerUtil.joinNames;

window.t = LocalizerUtil.translate;
