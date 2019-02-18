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

import SanitizationUtil from './SanitizationUtil';

window.z = window.z || {};
window.z.util = z.util || {};

const isStringOrNumber = toTest => _.isString(toTest) || _.isNumber(toTest);

const replaceSubstituteEscaped = (string, regex, substitute) => {
  const replacement = isStringOrNumber(substitute)
    ? SanitizationUtil.escapeString(substitute)
    : (found, content) =>
        substitute.hasOwnProperty(content) ? SanitizationUtil.escapeString(substitute[content]) : found;
  return string.replace(regex, replacement);
};

const replaceSubstitute = (string, regex, substitute) => {
  const replacement = isStringOrNumber(substitute)
    ? substitute
    : (found, content) => (substitute.hasOwnProperty(content) ? substitute[content] : found);
  return string.replace(regex, replacement);
};

export const DEFAULT_LOCALE = 'en';

let locale = DEFAULT_LOCALE;
let strings = {};

const LocalizerUtil = {
  joinNames: (userEntities, declension = Declension.ACCUSATIVE, skipAnd = false, boldNames = false) => {
    const containsSelfUser = userEntities.some(userEntity => userEntity.is_me);
    if (containsSelfUser) {
      userEntities = userEntities.filter(userEntity => !userEntity.is_me);
    }

    const firstNames = userEntities
      .map(userEntity => {
        const firstName = userEntity.first_name();
        return boldNames ? `[bold]${firstName}[/bold]` : firstName;
      })
      .sort((userNameA, userNameB) => z.util.StringUtil.sortByPriority(userNameA, userNameB));

    if (containsSelfUser) {
      firstNames.push(z.util.SanitizationUtil.getSelfName(declension));
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
        '/bold': '</b>',
        '/italic': '</i>',
        bold: '<b>',
        italic: '<i>',
      },
      dangerousSubstitutions
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

export default LocalizerUtil;

window.t = LocalizerUtil.translate;
