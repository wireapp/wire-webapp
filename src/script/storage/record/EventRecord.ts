/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {StatusType} from '../../message/StatusType';
import type {ReactionType} from '@wireapp/core/src/main/conversation/';
import {QualifiedIdOptional} from 'src/script/conversation/EventBuilder';

export interface ReadReceipt {
  domain?: string;
  time: string;
  userId: string;
}

export interface AssetRecord {
  key?: string;
  otr_key: Uint8Array;
  sha256: Uint8Array;
  token?: string;
}

export type UserReactionMap = {[userId: string]: ReactionType};

export interface EventRecord<T = any> {
  category?: number;
  client?: {time: string};
  connection?: {lastUpdate: string};
  content?: string;
  conversation: string;
  data?: T;
  edited_time?: string;
  ephemeral_expires?: boolean | string | number;
  ephemeral_started?: number;
  ephemeral_time?: string;
  error_code?: string;
  from: string;
  from_client_id?: string;
  id?: string;
  mentions?: string[];
  qualified_conversation?: QualifiedIdOptional;
  message?: string;
  previews?: string[];
  /** Only used with IndexedDB table 'event' */
  primary_key?: string;
  reactions?: UserReactionMap;
  read_receipts?: ReadReceipt[];
  selected_button_id?: string;
  server_time?: string;
  status?: StatusType;
  /** The time as ISO date string */
  time: string;
  timestamp?: number;
  type: string;
  version?: number;
  waiting_button_id?: string;
}
