/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {z} from 'zod';

import {
  ADD_PERMISSION,
  CONVERSATION_ACCESS,
  CONVERSATION_ACCESS_ROLE,
  CONVERSATION_CELLS_STATE,
  CONVERSATION_LEGACY_ACCESS_ROLE,
  CONVERSATION_TYPE,
  GROUP_CONVERSATION_TYPE,
} from './conversation';
import {RECEIPT_MODE} from './data/conversationReceiptModeUpdateData';

import {CONVERSATION_PROTOCOL} from '../team';

export const qualifiedIdSchema = z.object({
  domain: z.string(),
  id: z.string().min(1),
});

const serviceRefSchema = z.object({
  id: z.string(),
  provider: z.string(),
});

const conversationMemberSchema = z.object({
  id: z.string(),
  conversation_role: z.string().optional(),
  hidden: z.boolean().optional(),
  hidden_ref: z.string().nullable().optional(),
  otr_archived: z.boolean().optional(),
  otr_archived_ref: z.string().nullable().optional(),
  otr_muted_ref: z.string().nullable().optional(),
  otr_muted_status: z.number().nullable().optional(),
  service: serviceRefSchema.nullable().optional(),
  status_ref: z.string().optional(),
  status_time: z.string().optional(),
  qualified_id: qualifiedIdSchema.optional(),
});

const conversationOtherMemberSchema = conversationMemberSchema.extend({
  status: z.number().optional(),
});

export const conversationMembersSchema = z.object({
  self: conversationMemberSchema.optional(),
  others: z.array(conversationOtherMemberSchema),
});

/**
 * Canonical conversation object returned by the Wire backend.
 * Matches fields consumed by the webapp ConversationMapper.
 */
export const conversationSchema = z.object({
  qualified_id: qualifiedIdSchema,
  creator: z.string(),
  type: z.nativeEnum(CONVERSATION_TYPE),
  access: z.array(z.nativeEnum(CONVERSATION_ACCESS)),
  access_role: z.union([
    z.nativeEnum(CONVERSATION_LEGACY_ACCESS_ROLE),
    z.array(z.nativeEnum(CONVERSATION_ACCESS_ROLE)),
  ]),
  access_role_v2: z.array(z.nativeEnum(CONVERSATION_ACCESS_ROLE)).optional(),
  cells_state: z.nativeEnum(CONVERSATION_CELLS_STATE),
  group_conv_type: z.nativeEnum(GROUP_CONVERSATION_TYPE).optional(),
  add_permission: z.nativeEnum(ADD_PERMISSION).optional(),
  name: z.string().optional(),
  last_event: z.string().optional(),
  last_event_time: z.string().optional(),
  team: z
    .string()
    .nullable()
    .optional()
    .transform(team => team ?? undefined),
  message_timer: z
    .number()
    .nullable()
    .optional()
    .transform(messageTimer => messageTimer ?? undefined),
  receipt_mode: z
    .nativeEnum(RECEIPT_MODE)
    .nullable()
    .optional()
    .transform(receiptMode => receiptMode ?? undefined),
  members: conversationMembersSchema,
  protocol: z.nativeEnum(CONVERSATION_PROTOCOL),
  initial_protocol: z.nativeEnum(CONVERSATION_PROTOCOL).optional(),
  group_id: z.string().optional(),
  epoch: z.number().optional(),
  cipher_suite: z.number().optional(),
  domain: z.string().optional(),
});

/**
 * Embedded meeting conversation returned with meeting create/update responses.
 * Meeting conversations are always MLS-backed with group_conv_type "meeting".
 */
export const meetingConversationSchema = conversationSchema.extend({
  group_conv_type: z.literal(GROUP_CONVERSATION_TYPE.MEETING),
  protocol: z.literal(CONVERSATION_PROTOCOL.MLS),
  group_id: z.string(),
  epoch: z.number(),
});

export type ValidatedConversation = z.infer<typeof conversationSchema>;
export type ValidatedMeetingConversation = z.infer<typeof meetingConversationSchema>;
