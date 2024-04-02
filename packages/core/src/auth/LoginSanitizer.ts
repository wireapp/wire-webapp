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

import {LoginData} from '@wireapp/api-client/lib/auth/';

export class LoginSanitizer {
  constructor() {}

  public static removeNonPrintableCharacters(loginData: LoginData): void {
    const nonPrintableCharacters = /\s/gm;

    if (loginData.email) {
      loginData.email = loginData.email.replace(nonPrintableCharacters, '');
    }

    if (loginData.handle) {
      loginData.handle = loginData.handle.replace(nonPrintableCharacters, '');
    }

    if (loginData.password) {
      loginData.password = loginData.password.toString();
    }

    if (loginData.phone) {
      loginData.phone = loginData.phone.toString().replace(nonPrintableCharacters, '');
    }
  }
}
