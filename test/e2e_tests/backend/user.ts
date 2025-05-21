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
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username: string;
  token: string | null;
}

export const getUser = (user: Partial<User> = {}): User => ({
  ...user,
  email: user?.email ?? faker.internet.email({lastName: user?.lastName, provider: 'wire.engineering'}).toLowerCase(),
  password: user?.password ?? faker.internet.password({length: 8, pattern: /[A-Za-z\d!@#$]/}),
  firstName: user?.firstName ?? faker.person.firstName(),
  lastName: user?.lastName ?? faker.person.lastName(),
  username: user?.username ?? `${user?.lastName}${faker.string.alpha({length: 5, casing: 'lower'})}`.toLowerCase(),
  token: user?.token ?? null,
});
