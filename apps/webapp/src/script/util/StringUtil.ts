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

import type {User} from 'Repositories/entity/User';
import getSlug from 'speakingurl';
import {randomElement} from 'Util/ArrayUtil';

export const startsWith = (string = '', query: string): boolean => string.toLowerCase().startsWith(query.toLowerCase());
export const includesString = (string = '', query = ''): boolean => string.toLowerCase().includes(query.toLowerCase());
export const getFirstChar = (string: string): string => [...string][0]; // the destructuring is needed to properly return unicode characters

/**
 * @param bytes bytes to convert
 * @returns bytes as hex string
 */
export const bytesToHex = (bytes: number[]): string => {
  const hexBase = 16;
  const padIndex = 2;
  return Array.from(bytes, byte => byte.toString(hexBase).padStart(padIndex, '0')).join('');
};

export const capitalizeFirstChar = (string = ''): string => `${string.charAt(0).toUpperCase()}${string.substring(1)}`;

export const computeTransliteration = (string: string, excludedChars = {}): string => {
  const options = {custom: excludedChars, uric: true};
  return getSlug(string, options);
};

export const getRandomChar = (): string => {
  const charArray = Array.from('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
  return randomElement(charArray);
};

export const obfuscate = (text: string): string => {
  const alphabet = Array.from('abcdefghijklmnopqrstuvwxyz ');

  const obfuscatedText = Array.from({length: text.length + Math.floor((1 + Math.random()) * 10)}, () =>
    randomElement(alphabet),
  ).join('');

  return obfuscatedText;
};

/**
 * Returns `true` if the string and the query match by applying transliteration first.
 *
 * @param string the string to compare the query against
 * @param query the query to compare to the string
 * @param excludedChars extra characters to ignore when creating a slug
 * @param fromStart should the query match the string from the beginning of the string
 * @returns does the string match the query
 */
export const compareTransliteration = (
  string: string,
  query: string,
  excludedChars: Record<string, string> = {},
  fromStart = false,
): boolean => {
  const nameSlug = computeTransliteration(string, excludedChars);
  const querySlug = computeTransliteration(query, excludedChars);
  return fromStart ? nameSlug.startsWith(querySlug) : includesString(nameSlug, querySlug);
};

export const transliterationIndex = (nameSlug: string, querySlug: string): number => nameSlug.indexOf(querySlug);

export const truncate = (string: string, outputLength: number, wordBoundary = true): string => {
  if (string.length > outputLength) {
    let truncateIndex = outputLength - 1;
    if (wordBoundary && string.lastIndexOf(' ', outputLength - 1) > outputLength - 25) {
      truncateIndex = string.lastIndexOf(' ', outputLength - 1);
    }
    string = `${string.slice(0, truncateIndex)}…`;
  }
  return string;
};

/**
 * Replaces designated places in the source string with the additional arguments
 * e.g. `formatString('{0} {1}!!!', 'Hello', 'World') => 'Hello World!!!'`
 *
 * @param string source string
 * @param args replacements for placeholders in source string
 * @returns source string with replacements applied
 */
export const formatString = (string: string, ...args: any[]): string => {
  args.forEach((arg, index) => {
    const reg = new RegExp(`\\{${index}\\}`, 'gm');
    string = string.replace(reg, arg);
  });
  return string;
};

export const removeLineBreaks = (string = ''): string => string.replace(/[\r\n]/gm, '');

export const replaceInRange = (text: string, replacement: string, startIndex: number, endIndex: number): string => {
  const beforePartial = text.slice(0, startIndex);
  const afterPartial = text.slice(endIndex);
  return `${beforePartial}${replacement}${afterPartial}`;
};

export const sortByPriority = (stringA: string = '', stringB: string = '', query: string = ''): number => {
  stringA = stringA.toLowerCase();
  stringB = stringB.toLowerCase();
  query = query.toLowerCase();

  if (query) {
    if (stringA.startsWith(query) && !stringB.startsWith(query)) {
      return -1;
    } else if (stringB.startsWith(query) && !stringA.startsWith(query)) {
      return 1;
    }
  }

  return stringA.localeCompare(stringB);
};

export const sortUsersByPriority = (userA: User, userB: User): number => sortByPriority(userA.name(), userB.name());

/**
 * @param str The string to convert
 * @returns Converted string as byte array
 */
export const utf8ToUtf16BE = (str = ''): number[] => {
  const BOMChar = '\uFEFF';

  str = `${BOMChar}${str}`;

  const bytes: number[] = [];
  str
    .split('')
    .map(char => char.charCodeAt(0))
    .forEach(charCode => {
      bytes.push((charCode & 0xff00) >> 8);
      bytes.push(charCode & 0xff);
    });

  return bytes;
};

export const splitFingerprint = (fingerprint: string): string[] => fingerprint?.padStart(16, '0').match(/(..?)/g) ?? [];

// When we receive strings via Websocket, it will have been converted to utf-8,
// In order to keep Emojis and other unicode characters, we need to run the TextDecoder
// over the numeric values of the single characters of the received string.
export const fixWebsocketString = (originalString: string): string => {
  const charArray = Uint8Array.from([...originalString].map(c => c.charCodeAt(0)));
  const decoder = new TextDecoder();
  return decoder.decode(charArray);
};

const accentsMap: Record<string, string> = {
  ä: 'a',
  á: 'a',
  à: 'a',
  ã: 'a',
  â: 'a',
  À: 'a',
  Á: 'a',
  Ã: 'a',
  Â: 'a',
  ë: 'e',
  é: 'e',
  è: 'e',
  ê: 'e',
  É: 'e',
  È: 'e',
  Ê: 'e',
  ï: 'i',
  í: 'i',
  ì: 'i',
  î: 'i',
  Í: 'i',
  Ì: 'i',
  Î: 'i',
  ö: 'o',
  ó: 'o',
  ò: 'o',
  ô: 'o',
  õ: 'o',
  Ó: 'o',
  Ò: 'o',
  Ô: 'o',
  Õ: 'o',
  ú: 'u',
  ù: 'u',
  û: 'u',
  ü: 'u',
  Ú: 'u',
  Ù: 'u',
  Û: 'u',
  Ü: 'u',
  ç: 'c',
  Ç: 'c',
  ñ: 'n',
  Ñ: 'n',
};

/**
 * @param text The string to replace accents its charachters
 * @returns new string with replaced accents charachters
 */
export const replaceAccents = (text: string) => getSlug(text, {custom: accentsMap, uric: true});

/**
 * generate a random password
 * @param passwordLength the desired length of the password
 * @returns the newly generated password
 */
export const generateRandomPassword = (passwordLength: number = 8): string => {
  // Define strings containing all possible lowercase letters, uppercase letters, numbers, and special characters
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numericChars = '0123456789';
  const specialChars = '!@#$%^&*()_+-={}[];\',.?/~`|:"<>';

  // Concatenate all possible characters into a single string
  const allChars = lowercaseChars + uppercaseChars + numericChars + specialChars;

  // Helper function to get a secure random index
  const getRandomIndex = (max: number): number => {
    const randomValues = new Uint32Array(1);
    crypto.getRandomValues(randomValues);
    return randomValues[0] % max;
  };

  // Calculate the number of characters to add to the password to meet the minimum requirements
  const minRequiredChars = 4;
  const additionalChars = Math.max(0, passwordLength - minRequiredChars);

  // Add one random lowercase letter, one random uppercase letter, one random number, and one random special character to the password
  let password = '';
  password += lowercaseChars[getRandomIndex(lowercaseChars.length)];
  password += uppercaseChars[getRandomIndex(uppercaseChars.length)];
  password += numericChars[getRandomIndex(numericChars.length)];
  password += specialChars[getRandomIndex(specialChars.length)];

  // Add additional random characters to the password using all possible characters
  for (let i = 0; i < additionalChars; i++) {
    password += allChars[getRandomIndex(allChars.length)];
  }

  // Shuffle the characters of the password randomly to make it more secure
  password = password
    .split('')
    .sort(() => getRandomIndex(2) - 1) // Generates either -1 or 1 for shuffling
    .join('');

  // Truncate the password to the desired length if necessary
  password = password.slice(0, passwordLength);

  // Return the resulting password as a string
  return password;
};

/**
 * Checks if a given password meets the specified conditions.
 * The password must:
 * - Have at least one uppercase letter
 * - Have at least one lowercase letter
 * - Have at least one number
 * - Have at least one symbol
 * - Have a minimum length of 8 characters
 *
 * @param {string} password - The password to be checked.
 * @returns {boolean} True if the password meets all conditions, false otherwise.
 */
export function isValidPassword(password: string): boolean {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$/;
  return passwordRegex.test(password);
}
