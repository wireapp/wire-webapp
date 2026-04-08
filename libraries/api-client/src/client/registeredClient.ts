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

import {ClientCapability, ClientType, Location, MLSPublicKeyRecord, PublicClient} from './';

export interface AddedClient extends PublicClient {
  /** The IP address from which the client was registered */
  address?: string;
  label?: string;
  location?: Location;
  model?: string;
  /** An ISO 8601 Date string */
  time: string;
  type: ClientType.PERMANENT | ClientType.TEMPORARY;
  mls_public_keys: MLSPublicKeyRecord;
  last_active?: string;
}

export interface RegisteredClient extends AddedClient {
  /** The cookie label */
  capabilities: ClientCapability[];
  cookie: string;
}
