/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {faker} from '@faker-js/faker';

import {sanitizeName} from './userDataProcessor';

export const generateSecurePassword = (length: number = 8): string => {
  if (length < 8) {
    throw new Error('Password length must be at least 8 characters.');
  }
  // Leave 2 characters for a special symbol and a number
  const numberOfLetters = length - 2;
  const lowerCaseLetters = faker.string.alpha({length: numberOfLetters / 2, casing: 'lower'});
  const upperCaseLetters = faker.string.alpha({length: numberOfLetters / 2, casing: 'upper'});
  const number = faker.string.numeric({length: 1});
  const symbol = faker.helpers.arrayElement(['!', '@', '#', '$', '%', '&', '*']);

  // Combine and shuffle the characters
  const allChars = [...(lowerCaseLetters + upperCaseLetters + number + symbol)];
  const shuffled = faker.helpers.shuffle(allChars);

  return shuffled.join('');
};

export const generateLastName = (): string => {
  // Just have text without special characters
  return faker.person.lastName().replace(/[^a-zA-Z]+/g, '');
};

export const generateFirstName = (): string => {
  // Just have text without special characters
  return faker.person.firstName().replace(/[^a-zA-Z]+/g, '');
};

export const generateWireEmail = (lastName: string): string => {
  return faker.internet.email({lastName: sanitizeName(lastName), provider: 'wire.engineering'}).toLowerCase();
};

export const generateUsername = (firstName: string, lastName: string): string => {
  const username = `${sanitizeName(firstName)}${sanitizeName(lastName)}`.toLowerCase();
  return username.slice(0, 20);
};
