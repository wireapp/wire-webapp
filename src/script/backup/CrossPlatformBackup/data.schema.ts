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

const ConversationSchema = zod.object({
  accessModes: zod.array(zod.string()).optional(),
  accessRole: zod.array(zod.any()).optional(),
  accessRoleV2: zod.string().optional(),
  archived_state: zod.boolean(),
  archived_timestamp: zod.number(),
  cipher_suite: zod.number().optional(),
  creator: zod.string(),
  domain: zod.string(),
  group_id: zod.string().optional(),
  id: zod.string(),
  last_event_timestamp: zod.number(),
  last_server_timestamp: zod.number(),
  message_timer: zod.string().nullable().optional(),
  muted_state: zod.number().nullable(),
  muted_timestamp: zod.number(),
  name: zod.string().nullable(),
  others: zod.array(zod.any()),
  protocol: zod.string(),
  receipt_mode: zod.number().nullable(),
  roles: zod.object({}).passthrough(),
  status: zod.number(),
  team_id: zod.string().nullable().optional(),
  type: zod.number(),
});
export const ConversationTableSchema = zod.array(ConversationSchema);
export type ConversationTable = zod.infer<typeof ConversationTableSchema>;

const UserSchema = zod.object({
  accent_id: zod.number().optional(),
  assets: zod.array(zod.any()).optional(),
  handle: zod.string().optional(),
  id: zod.string(),
  legalhold_status: zod.string().optional(),
  name: zod.string(),
  picture: zod.array(zod.any()).optional(),
  qualified_id: zod
    .object({
      domain: zod.string(),
      id: zod.string(),
    })
    .optional(),
  supported_protocols: zod.array(zod.string()).optional(),
  team: zod.string().optional(),
});
export const UserTableSchema = zod.array(UserSchema);
export type UserTable = zod.infer<typeof UserTableSchema>;

const EventSchema = zod.object({
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
export const EventTableSchema = zod.array(EventSchema);
export type EventTable = zod.infer<typeof EventTableSchema>;

export const AssetContentSchema = zod.object({
  content_length: zod.number(),
  content_type: zod.string(),
  domain: zod.string().optional(),
  expects_read_confirmation: zod.boolean(),
  info: zod.any(),
  key: zod.string(),
  legal_hold_status: zod.number(),
  otr_key: zod.record(zod.string(), zod.number()),
  sha256: zod.record(zod.string(), zod.number()),
  status: zod.string().optional(),
  token: zod.string().optional(),
});
