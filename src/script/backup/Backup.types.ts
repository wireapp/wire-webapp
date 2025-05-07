/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {UserRecord, EventRecord, ConversationRecord} from '../storage';

export interface Metadata {
  client_id: string;
  creation_time: string;
  platform: 'Web';
  user_handle: string;
  user_id: string;
  user_name: string;
  version: number;
}

export type ProgressCallback = (done: number) => void;

export type FileDescriptor =
  | {
      entities: UserRecord[];
      filename: Filename.USERS;
    }
  | {
      entities: EventRecord[];
      filename: Filename.EVENTS;
    }
  | {
      entities: ConversationRecord[];
      filename: Filename.CONVERSATIONS;
    };

export enum Filename {
  CONVERSATIONS = 'conversations.json',
  EVENTS = 'events.json',
  USERS = 'users.json',
  METADATA = 'export.json',
}

export type FileData = Record<string, Uint8Array>;
