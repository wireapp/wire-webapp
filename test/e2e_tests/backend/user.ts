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

export interface User {
  id?: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  fullName: string;
  username: string;
  devices: string[];
  teamId?: string;
  token?: string;
}

export const getUser = (user: Partial<User> = {}): User => {
  // Ensure lastName is always defined, as it is used in email and username generation
  const lastName = user.lastName ?? faker.person.lastName().replaceAll("'", '');
  const firstName = user.firstName ?? faker.person.firstName().replaceAll("'", '');

  return {
    ...user,
    email: user.email ?? faker.internet.email({lastName, provider: 'wire.engineering'}).toLowerCase(),
    password: user.password ?? generateSecurePassword(),
    firstName,
    lastName,
    fullName: user.fullName ?? `${firstName} ${lastName}`,
    username:
      user.username ??
      `${lastName}${faker.string.alpha({length: 5, casing: 'lower'})}`.replaceAll("'", '').toLowerCase(),
    token: user.token ?? undefined,
    devices: user.devices ?? [],
  };

  function generateSecurePassword(length: number = 8): string {
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
  }
};
