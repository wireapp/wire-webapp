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

import {
  generateWireEmail,
  generateFirstName,
  generateLastName,
  generateSecurePassword,
  generateUsername,
} from '../utils/userDataGenerator';

export interface User {
  id?: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  fullName: string;
  username: string;
  devices: string[];
  teamId: string;
  token: string;
  qualifiedId?: {
    domain: string;
    id: string;
  };
}

export const getUser = (user: Partial<User> = {}): User => {
  // Ensure lastName is always defined, as it is used in email and username generation
  const lastName = user.lastName ?? generateLastName();
  const firstName = user.firstName ?? generateFirstName();

  return {
    ...user,
    email: user.email ?? generateWireEmail(lastName),
    password: user.password ?? generateSecurePassword(),
    firstName,
    lastName,
    fullName: user.fullName ?? `${firstName} ${lastName}`,
    username: user.username ?? generateUsername(firstName, lastName),
    devices: user.devices ?? [],
    teamId: user.teamId ?? '',
    token: user.token ?? '',
  };
};
