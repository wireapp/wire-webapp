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

import {isNullOrUndefined} from '@sindresorhus/is';
import {z} from 'zod';

import type {QualifiedId} from '../apiClient/user';
import type {MeetingPrepSession} from '../components/meeting/meetingPrep/useMeetingPrepModal';

export type JoinLinkResult = {conversation: QualifiedId; eventTime?: string; meetingPrep?: MeetingPrepSession};

const qualifiedIdSchema = z.object({id: z.string().min(1), domain: z.string().min(1)});
export const joinedMeetingDestinationSchema = z
  .object({
    qualified_conversation: qualifiedIdSchema,
    qualified_id: qualifiedIdSchema,
    title: z.string().min(1),
    start_time: z.iso.datetime(),
  })
  .transform(meeting => {
    return {
      conversation: meeting.qualified_conversation,
      meetingPrep: {
        meetingTitle: meeting.title,
        meetingStartTime: meeting.start_time,
        qualifiedMeetingId: meeting.qualified_id,
        qualifiedConversationId: meeting.qualified_conversation,
      },
    };
  });

const pendingMeetingPrepSchema = z.object({
  meetingPrep: z.object({
    meetingTitle: z.string().min(1),
    meetingStartTime: z.iso.datetime(),
    qualifiedMeetingId: qualifiedIdSchema,
    qualifiedConversationId: qualifiedIdSchema,
  }),
});
export function loginJoinDestination(result: JoinLinkResult): {
  conversation: string;
  domain: string;
  meetingPrep?: MeetingPrepSession;
} {
  return {
    conversation: result.conversation.id,
    domain: result.conversation.domain,
    ...(isNullOrUndefined(result.meetingPrep) ? {} : {meetingPrep: result.meetingPrep}),
  };
}

export function openLoginMeetingPrep(data: unknown, open: (session: MeetingPrepSession) => void): boolean {
  const destination = pendingMeetingPrepSchema.safeParse(data);
  if (!destination.success) {
    return false;
  }
  open(destination.data.meetingPrep);
  return true;
}
