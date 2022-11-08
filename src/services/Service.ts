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

import {PreKey} from '../auth/PreKey';
import {ClientType} from '../client';
import {PublicClient} from '../client/PublicClient';
import {OtherMember, NewOTRMessage} from '../conversation';
import {UserAsset, User} from '../user';

export interface NewService {
  /** The client ID for the service. */
  client: string;
  /**
   * The conversation as seen by the service and as returned from
   * `GET /bot/conversation`.
   */
  conversation: ServiceConversation;
  /** The unique user ID for the service. */
  id: string;
  /**
   * The preferred locale for the service to use, in form of an
   * [IETF language tag](https://en.wikipedia.org/wiki/IETF_language_tag).
   */
  locale: string;
  /**
   * The profile of the user who requested the service, as it is returned from
   * `GET /service/users`.
   */
  origin: object;
  /** The bearer token that the service must use on inbound requests. */
  token: string;
}

export interface ServiceConversation {
  /**  The ID of the conversation. */
  id: string;
  /**  The list of members, not including the service itself. */
  members: OtherMember[];
  /**  The name of the conversation. */
  name?: string;
}

export interface RegisteredService {
  /**
   * A number between 1 and 7 that identifies one of the standard Wire profile
   * colours to use for the service's user profile. By default, the service is assigned
   * the accent colour associated with the service profile.
   */
  accent_id?: number;
  /**
   * A list of user profile assets to attach to the service's user profile. By
   * default, the service is assigned the assets associated with the service profile.
   */
  assets: UserAsset[];
  /** The last resort prekey. It must have the ID `65535`. */
  last_prekey: PreKey;
  /**
   * The name to use for the service's user profile. By default, the service is
   * assigned the name of the associated service profile.
   */
  name?: string;
  prekeys: PreKey[];
}

export interface Self {
  /** The service's accent colour. */
  accent_id: number;
  /** The service's public profile assets (e.g. images). */
  assets: UserAsset[];
  /** The service's user ID. */
  id: string;
  /** The service's name. */
  name: string;
}

export interface Client {
  /** The service's client ID. */
  id: string;
  /** The UTC timestamp when the client was created. */
  time: string;
  /** The service's client type. This is currently always permanent. */
  type: ClientType.PERMANENT;
}

export type UserPreKeyList = Record<string, string[]>;
export type UserPreKeyDataList = Record<string, Record<string, string>>;
export type UserSeenByService = Pick<User, 'id' | 'name' | 'accent_id'>;
export type ClientSeenByService = PublicClient;
export type ServiceMessage = NewOTRMessage<Uint8Array>;
