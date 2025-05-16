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

export class ClientUser {
  private readonly passwordPattern = /[A-Za-z\d!@#$]/;
  private readonly emailProvider = 'wire.engineering';

  private readonly firstName: string;
  private readonly lastName: string;
  private readonly uniqueUsername: string;
  private readonly userPassword: string;
  private readonly emailAddress: string;

  private accessToken: string | null = null;

  constructor(firstName?: string, lastName?: string, password?: string) {
    this.firstName = firstName ?? faker.person.firstName();
    this.lastName = lastName ?? faker.person.lastName();
    this.uniqueUsername = `${this.lastName}${faker.string.alpha({length: 5, casing: 'lower'})}`.toLowerCase();
    this.userPassword = password ?? faker.internet.password({length: 8, pattern: this.passwordPattern});
    this.emailAddress = faker.internet.email({lastName: this.lastName, provider: this.emailProvider}).toLowerCase();
  }

  get username(): string {
    return this.uniqueUsername;
  }

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  get email(): string {
    return this.emailAddress;
  }

  get password(): string {
    return this.userPassword;
  }

  get token(): string | null {
    return this.accessToken;
  }

  set token(value: string) {
    this.accessToken = value;
  }
}
