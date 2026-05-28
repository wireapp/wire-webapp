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

/** Represents a Wire user with optional display hints so the LLM can refer to participants naturally. */
export const QualifiedUserSchema = z.object({
  id: z.string(),
  domain: z.string().optional(),
  handle: z.string().optional(),
  name: z.string().optional(),
});

const IsoDateString = z.string().describe('ISO 8601 timestamp');

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

/** Payload for a ticket draft entry (only when somebody in the conversation explicitly suggested creating a ticket). */
export const TicketPayloadSchema = z.object({
  type: z.literal('ticket'),
  title: z.string(),
  description: z.string(),
  created_at: IsoDateString,
});

export const EntryPayloadSchema = z.discriminatedUnion('type', [
  ReportPayloadSchema,
  TodoPayloadSchema,
  TicketPayloadSchema,
]);

export type EntryPayload = z.infer<typeof EntryPayloadSchema>;
export type EntryType = EntryPayload['type'];

/** User-facing lifecycle status for a single extracted entry. */
export type EntryLifecycleStatus = 'pending' | 'accepted' | 'hidden';

/** Sub-report entries carry a source_timestamp the LLM picks from the triggering transcript line. */
export const SubReportEntrySchema = z.intersection(
  EntryPayloadSchema,
  z.object({
    source_timestamp: z
      .string()
      .describe(
        'ISO 8601 timestamp (e.g. "2026-01-15T14:32:00.000Z") of the transcript line that most directly prompted this entry — convert the [YYYY-MM-DD HH:mm] prefix to ISO 8601; do not invent timestamps',
      ),
  }),
);
export type Entry = z.infer<typeof SubReportEntrySchema>;

/**
 * Stored form of a sub-report entry — Entry plus a server-assigned stable UUID
 * used to key entry_statuses and to reference entries in incremental update actions.
 */
export type StoredEntry = Entry & {id: string};

/** Final-report entries carry conversation_ids[] tying them back to one or more conversations. */
export const FinalEntrySchema = z.intersection(
  EntryPayloadSchema,
  z.object({conversation_ids: z.array(z.string()).min(1)}),
);
export type FinalEntry = z.infer<typeof FinalEntrySchema>;

/** Tool-call schema for per-conversation sub-report (what we ask the LLM to return). */
export const SubReportToolArgsSchema = z.object({
  entries: z.array(SubReportEntrySchema),
});

/** Tool-call schema for final merged report (what we ask the LLM to return). */
export const FinalReportToolArgsSchema = z.object({
  entries: z.array(FinalEntrySchema),
});

/** Action shapes for the incremental re-scan tool. The LLM emits creates for new entries
 *  and updates (referencing the existing entry id) for changes to existing ones. */
const SubReportIncrementalCreateSchema = z.object({
  op: z.literal('create'),
  entry: SubReportEntrySchema,
});

const SubReportIncrementalUpdateSchema = z.object({
  op: z.literal('update'),
  id: z.string().describe('Stable UUID of the existing entry to modify — must match an id from <existing_entries>'),
  entry: SubReportEntrySchema,
});

export const SubReportIncrementalActionSchema = z.discriminatedUnion('op', [
  SubReportIncrementalCreateSchema,
  SubReportIncrementalUpdateSchema,
]);
export type SubReportIncrementalAction = z.infer<typeof SubReportIncrementalActionSchema>;

/** Tool-call schema for incremental re-scan (create new entries or update existing ones). */
export const SubReportIncrementalToolArgsSchema = z.object({
  actions: z.array(SubReportIncrementalActionSchema),
});
