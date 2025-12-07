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

import type {QualifiedUserClients} from '@wireapp/api-client/lib/conversation';
import type {ConversationEvent} from '@wireapp/api-client/lib/event';
import type {QualifiedId} from '@wireapp/api-client/lib/user';
import type {ReactionType} from '@wireapp/core/lib/conversation/';
import {ClientConversationEvent} from 'Repositories/conversation/EventBuilder';

import {StatusType} from '../../../message/StatusType';

export interface ReadReceipt {
  domain?: string;
  time: string;
  userId: string;
}

export interface AssetRecord {
  domain?: string;
  key?: string;
  otr_key: Uint8Array;
  sha256: Uint8Array;
  token?: string;
}

/** @deprecated as of Oct 2023, this is the old format we stored reactions in */
export type UserReactionMap = {[userId: string]: ReactionType};
export type ReactionMap = [reaction: string, userIds: QualifiedId[]][];

/**
 * Represent an event that has been sent by the current device
 */
type SentEvent = {
  /** sending status of the event*/
  status: StatusType;
  /** raw content of a file that was supposed to be sent but failed. Is undefined if the message has been successfully sent  */
  fileData?: Blob;
  failedToSend?: {
    queue?: QualifiedUserClients | QualifiedId[];
    failed?: QualifiedId[];
  };
};

/** represents an event that was saved to the DB */
export type StoredEvent<T> = {
  /** Only used with IndexedDB table 'event' */
  primary_key: string;
  category: number;
  id?: string;
  /** if the message is ephemeral, that's the amount of time it should be displayed to the user
   * the different types are
   *  - string: a datestring
   *  - number: a timestamp
   *  - boolean: indicate it has been consumed
   */
  ephemeral_expires?: number | boolean | string;
  ephemeral_started?: number;
  ephemeral_time?: string;
  /** some events are updated sequentially and we keep track of a version */
  version?: number;
} & Partial<SentEvent> & {
    [K in keyof T]: T[K];
  };

export type EventRecord = StoredEvent<ConversationEvent | ClientConversationEvent>;

/** @deprecated This is the old swallow-all type. Use the EventRecord Discriminated Union Type instead */
export type LegacyEventRecord<T = any> = {
  client?: {time: string};
  connection?: {lastUpdate: string};
  content?: string;
  conversation: string;
  data?: T;
  edited_time?: string;
  error_code?: number | string;
  error?: string;
  from: string;
  from_client_id?: string;
  mentions?: string[];
  message?: string;
  previews?: string[];
  qualified_conversation?: QualifiedId;
  qualified_from?: QualifiedId;
  reactions?: ReactionMap | UserReactionMap;
  read_receipts?: ReadReceipt[];
  selected_button_id?: string;
  server_time?: string;
  /** The time as ISO date string */
  time: string;
  timestamp?: number;
  type: string;
  waiting_button_id?: string;
  senderClientId?: string;
} & Partial<StoredEvent<{}>>;
