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

export const QualifiedIdSchema = zod.object({
  domain: zod.string(),
  id: zod.string(),
});

export const ConversationTableEntrySchema = QualifiedIdSchema.extend({
  name: zod.string().nullable().optional(),
  last_event_timestamp: zod.number(),
});
export type ConversationTableEntry = zod.infer<typeof ConversationTableEntrySchema>;

export const UserTableEntrySchema = zod.object({
  handle: zod.string().optional(),
  id: zod.string(),
  name: zod.string().optional().nullable(),
  qualified_id: QualifiedIdSchema.optional(),
});
export type UserTableEntry = zod.infer<typeof UserTableEntrySchema>;

export const EventTableEntrySchema = zod.object({
  category: zod.number().int().optional(),
  conversation: zod.string().min(1, 'Conversation is required'),
  data: zod.any(),
  from: zod.string().optional().nullable(),
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
  meta: zod.any(),
  otr_key: zod.record(zod.string(), zod.number()),
  sha256: zod.record(zod.string(), zod.number()),
  token: zod.string().optional(),
});

export const LocationContentSchema = zod.object({
  location: zod.object({
    latitude: zod.number(),
    longitude: zod.number(),
    name: zod.string().optional().nullable(),
    zoom: zod.number().optional().nullable(),
  }),
});
