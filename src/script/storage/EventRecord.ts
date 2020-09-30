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

export interface ReadReceipt {
  time: string;
  userId: string;
}

export interface EventRecord {
  category: number;
  client?: {time: string};
  connection?: {lastUpdate: string};
  content?: string;
  conversation: string;
  data: any;
  edited_time?: string;
  ephemeral_expires?: number;
  ephemeral_started?: string;
  ephemeral_time?: string;
  error_code?: string;
  from: string;
  from_client_id?: string;
  id: string;
  mentions?: string[];
  message?: string;
  previews?: string[];
  primary_key: string;
  reactions: Record<string, string>;
  read_receipts?: ReadReceipt[];
  selected_button_id?: string;
  status?: number;
  time: string;
  timestamp?: number;
  type: string;
  version?: number;
  waiting_button_id?: string;
}
