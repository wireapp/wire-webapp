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

import {ClientType} from '@wireapp/api-client/lib/client/';

export interface BotConfig {
  /** Set the backend (staging or production) */
  backend?: 'production' | 'staging';
  /** Set the client type (permanent or temporary). */
  clientType?: ClientType;
  /** Set allowed conversations (if empty, all conversations are allowed). */
  conversations?: string[];
  /** Set allowed message owners (if empty, all users are allowed). */
  owners?: string[];
}

export interface BotCredentials {
  /** Your bot's email address on Wire. */
  email: string;
  /** Your bot's password on Wire. */
  password: string;
}
