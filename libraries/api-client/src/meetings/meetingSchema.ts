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

import {MeetingRecurrenceFrequency} from './meetingRecurrence';

import {
  ADD_PERMISSION,
  CONVERSATION_ACCESS,
  CONVERSATION_ACCESS_ROLE,
  CONVERSATION_CELLS_STATE,
  CONVERSATION_LEGACY_ACCESS_ROLE,
  GROUP_CONVERSATION_TYPE,
} from '../conversation/conversation';
import {CONVERSATION_PROTOCOL} from '../team';

/**
 * Runtime validation schemas for the Wire meetings API according to
 * https://staging-nginz-https.zinfra.io/v16/api/swagger-ui/#/default/get_meetings_list
 *
 * MeetingsAPI validates responses with parse() and throws on invalid data.
 */

const qualifiedIdSchema = z.object({
  domain: z.string(),
  id: z.string().min(1),
});

const utcTimeSchema = z.string().datetime();

const meetingRecurrenceSchema = z.object({
  frequency: z.nativeEnum(MeetingRecurrenceFrequency),
  interval: z.number().int().positive().optional(),
  until: utcTimeSchema.optional(),
});

const meetingFieldsSchema = {
  created_at: utcTimeSchema,
  end_time: utcTimeSchema,
  qualified_conversation: qualifiedIdSchema,
  qualified_creator: qualifiedIdSchema,
  qualified_id: qualifiedIdSchema,
  recurrence: meetingRecurrenceSchema.optional(),
  start_time: utcTimeSchema,
  title: z.string().min(1).max(256),
  trial: z.boolean(),
  updated_at: utcTimeSchema,
} as const;

const conversationMemberSchema = z.object({
  id: z.string(),
  conversation_role: z.string().optional(),
  hidden: z.boolean().optional(),
  hidden_ref: z.string().nullable().optional(),
  otr_archived: z.boolean().optional(),
  otr_archived_ref: z.string().nullable().optional(),
  otr_muted_ref: z.string().nullable().optional(),
  otr_muted_status: z.number().nullable().optional(),
  status_ref: z.string().optional(),
  status_time: z.string().optional(),
  qualified_id: qualifiedIdSchema.optional(),
});

const conversationOtherMemberSchema = conversationMemberSchema.extend({
  status: z.number().optional(),
});

const conversationMembersSchema = z.object({
  self: conversationMemberSchema.optional(),
  others: z.array(conversationOtherMemberSchema).optional(),
});

/**
 * Embedded conversation returned with meeting create/update responses.
 */
export const meetingConversationSchema = z.object({
  qualified_id: qualifiedIdSchema,
  creator: z.string(),
  type: z.number(),
  access: z.array(z.nativeEnum(CONVERSATION_ACCESS)).optional(),
  access_role: z
    .union([z.nativeEnum(CONVERSATION_LEGACY_ACCESS_ROLE), z.array(z.nativeEnum(CONVERSATION_ACCESS_ROLE))])
    .optional(),
  access_role_v2: z.array(z.nativeEnum(CONVERSATION_ACCESS_ROLE)).optional(),
  cells_state: z.nativeEnum(CONVERSATION_CELLS_STATE).optional(),
  group_conv_type: z.nativeEnum(GROUP_CONVERSATION_TYPE).optional(),
  add_permission: z.nativeEnum(ADD_PERMISSION).optional(),
  name: z.string().optional(),
  protocol: z.nativeEnum(CONVERSATION_PROTOCOL).optional(),
  initial_protocol: z.nativeEnum(CONVERSATION_PROTOCOL).optional(),
  group_id: z.string().optional(),
  epoch: z.number().optional(),
  cipher_suite: z.number().optional(),
  members: conversationMembersSchema.optional(),
  domain: z.string().optional(),
});

export const meetingSchema = z.object(meetingFieldsSchema);

export const meetingWithConversationSchema = z.object({
  ...meetingFieldsSchema,
  conversation: meetingConversationSchema,
});

export const meetingsListResponseSchema = z.array(meetingSchema);

export type ValidatedMeeting = z.infer<typeof meetingSchema>;
export type ValidatedMeetingConversation = z.infer<typeof meetingConversationSchema>;
export type ValidatedMeetingWithConversation = z.infer<typeof meetingWithConversationSchema>;
