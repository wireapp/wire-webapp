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

import {SSOSignature} from '../self/';
import {ManagedSource, User} from '../user/';

export interface Self extends User {
  locale: string;
  /**
   * What is the source of truth for this user; if it's SCIM
   * then the profile can't be edited via normal means.
   */
  managed_by?: ManagedSource;
  sso_id?: SSOSignature;
}
