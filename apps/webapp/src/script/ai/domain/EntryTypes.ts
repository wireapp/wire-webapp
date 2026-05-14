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

/** Single source of truth for all entry shapes the LLM can produce. Defines Zod schemas for report, todo, and ticket payloads, their discriminated union, and the tool-call argument wrappers used when calling Ollama. No I/O; pure validation logic only. */

import {z} from 'zod';

const IsoDateString = z.string().describe('ISO 8601 timestamp');

/** Represents a Wire user with optional display hints so the LLM can refer to participants naturally. */
export const QualifiedUserSchema = z.object({
  id: z.string(),
  domain: z.string().optional(),
  handle: z.string().optional(),
  name: z.string().optional(),
});

/** Payload for a conversation-summary report entry. Captures the participants involved, a prose description, and the time range covered. */
export const ReportPayloadSchema = z.object({
  type: z.literal('report'),
  participants: z.array(QualifiedUserSchema),
  description: z.string(),
  start: IsoDateString,
  end: IsoDateString,
});

/** Payload for an action-item entry extracted from the conversation. */
export const TodoPayloadSchema = z.object({
  type: z.literal('todo'),
  title: z.string(),
  description: z.string(),
  created_at: IsoDateString,
});

/** Payload for a bug/task ticket entry extracted from the conversation. */
export const TicketPayloadSchema = z.object({
  type: z.literal('ticket'),
  title: z.string(),
  description: z.string(),
  created_at: IsoDateString,
});

/** Discriminated union of all valid entry payload shapes. The 'type' field is the discriminator key. */
export const EntryPayloadSchema = z.discriminatedUnion('type', [
  ReportPayloadSchema,
  TodoPayloadSchema,
  TicketPayloadSchema,
]);

/** Inferred TypeScript union of all entry payload shapes. */
export type EntryPayload = z.infer<typeof EntryPayloadSchema>;

/** The discriminator string literal union: 'report' | 'todo' | 'ticket'. */
export type EntryType = EntryPayload['type'];

/** Sub-report entries are scoped to one conversation; they carry the payload only, no conversation_ids field. Alias of EntryPayloadSchema for semantic clarity. */
export const SubReportEntrySchema = EntryPayloadSchema;

/** Inferred TypeScript type for sub-report entries. */
export type Entry = z.infer<typeof SubReportEntrySchema>;

/** Final-report entries extend any payload shape with a non-empty conversation_ids array that ties the entry back to one or more source conversations. */
export const FinalEntrySchema = z.intersection(
  EntryPayloadSchema,
  z.object({
    conversation_ids: z.array(z.string()).min(1),
  }),
);

/** Inferred TypeScript type for final-report entries. */
export type FinalEntry = z.infer<typeof FinalEntrySchema>;

/** Tool-call argument schema for the sub-report LLM call. The LLM must return an object with an 'entries' array. */
export const SubReportToolArgsSchema = z.object({
  entries: z.array(SubReportEntrySchema),
});

/** Tool-call argument schema for the final-merge LLM call. Each entry carries conversation_ids back-references. */
export const FinalReportToolArgsSchema = z.object({
  entries: z.array(FinalEntrySchema),
});
