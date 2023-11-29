/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import type {ClientClassification} from '@wireapp/api-client/lib/client/';

export interface ClientRecord {
  address?: string;
  class: ClientClassification | '?';
  cookie?: string;
  domain?: string;
  id: string;
  label?: string;
  meta: {
    is_verified?: boolean;
    is_mls_verified?: boolean;
    primary_key?: string;
  };
  model?: string;
  time?: string;
  type?: 'permanent' | 'temporary';
  mls_public_keys?: Record<string, string>;
}
