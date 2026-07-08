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

export const meetingSchema = z.object({
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
});

export const meetingsListResponseSchema = z.array(meetingSchema);

export type ValidatedMeeting = z.infer<typeof meetingSchema>;
