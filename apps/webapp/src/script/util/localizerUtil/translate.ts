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

import is from '@sindresorhus/is';
import {escape} from 'underscore';

import type {Substitutions, TranslationKey} from './translationtypes';

type TranslationSubstitutions = Substitutions;

export const DEFAULT_LOCALE = 'en';

let locale = DEFAULT_LOCALE;
let strings: Record<string, Record<string, string>> = {};

function isStringOrNumber(toTest: any): toTest is string | number {
  return typeof toTest === 'string' || typeof toTest === 'number';
}

function replaceSubstituteEscaped(
  string: string,
  regex: RegExp | string,
  substitutes?: TranslationSubstitutions | Record<string, string>,
): string {
  if (isStringOrNumber(substitutes)) {
    return string.replace(regex, escape(substitutes.toString()));
  }
  return string.replace(regex, (found: string, content: string): string => {
    if (substitutes !== undefined && Object.hasOwn(substitutes, content)) {
      return escape(substitutes[content] as string);
    }
    return found;
  });
}

function replaceSubstitute(
  string: string,
  regex: RegExp | string,
  substitutes?: TranslationSubstitutions | Record<string, string>,
): string {
  if (isStringOrNumber(substitutes)) {
    return string.replace(regex, substitutes.toString());
  }
  return string.replace(regex, (found: string, content: string) => {
    if (substitutes !== undefined && Object.hasOwn(substitutes, content)) {
      return substitutes[content] as string;
    }
    return found;
  });
}

export function translate<Id extends TranslationKey>(
  identifier: Id,
  substitutions?: TranslationSubstitutions,
  dangerousSubstitutions?: Record<string, string>,
  skipEscape?: boolean,
): string {
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
}

export function setLocale(newLocale: string): void {
  locale = newLocale;
}

export function setStrings(newStrings: typeof strings): void {
  strings = newStrings;
}
