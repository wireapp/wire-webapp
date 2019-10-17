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

import {escapeString, getSelfName} from './SanitizationUtil';
import {sortByPriority} from './StringUtil';

export const DEFAULT_LOCALE = 'en';

let locale = DEFAULT_LOCALE;
let strings = {};

const isStringOrNumber = toTest => typeof toTest === 'string' || typeof toTest === 'number';

const replaceSubstituteEscaped = (string, regex, substitute) => {
  const replacement = isStringOrNumber(substitute)
    ? escapeString(substitute)
    : (found, content) => (substitute.hasOwnProperty(content) ? escapeString(substitute[content]) : found);
  return string.replace(regex, replacement);
};

const replaceSubstitute = (string, regex, substitute) => {
  const replacement = isStringOrNumber(substitute)
    ? substitute
    : (found, content) => (substitute.hasOwnProperty(content) ? substitute[content] : found);
  return string.replace(regex, replacement);
};

export const LocalizerUtil = {
  joinNames: (userEntities, declension = Declension.ACCUSATIVE, skipAnd = false, boldNames = false) => {
    const containsSelfUser = userEntities.some(userEntity => userEntity.isMe);
    if (containsSelfUser) {
      userEntities = userEntities.filter(userEntity => !userEntity.isMe);
    }

    const firstNames = userEntities
      .map(userEntity => {
        const firstName = userEntity.first_name();
        return boldNames ? `[bold]${firstName}[/bold]` : firstName;
      })
      .sort((userNameA, userNameB) => sortByPriority(userNameA, userNameB));

    if (containsSelfUser) {
      firstNames.push(getSelfName(declension));
    }

    const numberOfNames = firstNames.length;
    const joinByAnd = !skipAnd && numberOfNames >= 2;
    if (joinByAnd) {
      const [secondLastName, lastName] = firstNames.splice(firstNames.length - 2, 2);

      const exactlyTwoNames = numberOfNames === 2;
      const additionalNames = exactlyTwoNames
        ? `${secondLastName} ${t('and')} ${lastName}`
        : `${secondLastName}${t('enumerationAnd')}${lastName}`;
      firstNames.push(additionalNames);
    }

    return firstNames.join(', ');
  },

  translate: (identifier, substitutions = {}, dangerousSubstitutions = {}, skipEscape = false) => {
    const localeValue = strings[locale] && strings[locale][identifier];
    const defaultValue =
      strings[DEFAULT_LOCALE] && strings[DEFAULT_LOCALE].hasOwnProperty(identifier)
        ? strings[DEFAULT_LOCALE][identifier]
        : identifier;
    const value = localeValue || defaultValue;

    const replaceDangerously = Object.assign(
      {
        '/bold': '</strong>',
        '/italic': '</i>',
        bold: '<strong>',
        italic: '<i>',
      },
      dangerousSubstitutions,
    );

    const substitutedEscaped = skipEscape
      ? replaceSubstitute(value, /{{(.+?)}}/g, substitutions)
      : replaceSubstituteEscaped(value, /{{(.+?)}}/g, substitutions);
    const substituted = replaceSubstitute(substitutedEscaped, /\[(.+?)\]/g, replaceDangerously);

    return substituted;
  },
};

export const Declension = {
  ACCUSATIVE: 'accusative',
  DATIVE: 'dative',
  NOMINATIVE: 'nominative',
};

export const setLocale = newLocale => (locale = newLocale);

export const setStrings = newStrings => (strings = newStrings);

export function t(identifier, substitutions, dangerousSubstitutions, skipEscape = false) {
  return LocalizerUtil.translate(identifier, substitutions, dangerousSubstitutions, skipEscape);
}

export const joinNames = LocalizerUtil.joinNames;

window.t = LocalizerUtil.translate;
