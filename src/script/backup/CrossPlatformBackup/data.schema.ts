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

import zod from 'zod';

// For now we just check for the data we urgently need for the backup
export const ConversationTableEntrySchema = zod.object({
  domain: zod.string(),
  id: zod.string(),
  name: zod.string(),
  // accessModes: zod.array(zod.string()).optional(),
  // accessRole: zod.array(zod.any()).optional(),
  // accessRoleV2: zod.string().optional(),
  // archived_state: zod.boolean(),
  // archived_timestamp: zod.number(),
  // cipher_suite: zod.number().optional(),
  // creator: zod.string(),
  // group_id: zod.string().optional(),
  // last_event_timestamp: zod.number(),
  // last_server_timestamp: zod.number(),
  // message_timer: zod.string().nullable().optional(),
  // muted_state: zod.number().nullable(),
  // muted_timestamp: zod.number(),
  // others: zod.array(zod.any()),
  // protocol: zod.string(),
  // receipt_mode: zod.number().nullable(),
  // roles: zod.object({}).passthrough(),
  // status: zod.number(),
  // team_id: zod.string().nullable().optional(),
  // type: zod.number(),
});
export type ConversationTableEntry = zod.infer<typeof ConversationTableEntrySchema>;

// For now we just check for the data we urgently need for the backup
export const UserTableEntrySchema = zod.object({
  handle: zod.string().optional(),
  id: zod.string(),
  name: zod.string(),
  qualified_id: zod
    .object({
      domain: zod.string(),
      id: zod.string(),
    })
    .optional(),
  // accent_id: zod.number().optional(),
  // assets: zod.array(zod.any()).optional(),
  // legalhold_status: zod.string().optional(),
  // picture: zod.array(zod.any()).optional(),
  // supported_protocols: zod.array(zod.string()).optional(),
  // team: zod.string().optional(),
});
export type UserTableEntry = zod.infer<typeof UserTableEntrySchema>;

export const EventTableEntrySchema = zod.object({
  category: zod.number().int().optional(),
  conversation: zod.string().min(1, 'Conversation is required'),
  data: zod.any(),
  from: zod.string().optional(),
  from_client_id: zod.string().optional(),
  id: zod.string().optional(),
  primary_key: zod.number().int().positive('Primary key must be a positive integer'),
  qualified_conversation: zod.object({
    domain: zod.string().optional(),
    id: zod.string().min(1, 'Conversation ID is required'),
  }),
  qualified_from: zod
    .object({
      domain: zod.string().optional(),
      id: zod.string().min(1, 'User ID is required'),
    })
    .optional(),
  status: zod.number().int().optional(),
  time: zod.string(),
  type: zod.string().min(1, 'Type is required'),
});
export type EventTableEntry = zod.infer<typeof EventTableEntrySchema>;

export const AssetContentSchema = zod.object({
  content_length: zod.string().or(zod.number()),
  content_type: zod.string(),
  domain: zod.string().optional(),
  info: zod.any(),
  key: zod.string(),
  otr_key: zod.record(zod.string(), zod.number()),
  sha256: zod.record(zod.string(), zod.number()),
  token: zod.string().optional(),
  // expects_read_confirmation: zod.boolean(),
  // status: zod.string().optional(),
  // legal_hold_status: zod.number(),
});
