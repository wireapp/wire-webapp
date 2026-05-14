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

import {format} from 'date-fns';

import type {Conversation} from 'Repositories/entity/Conversation';
import type {EventRecord} from 'Repositories/storage/record/EventRecord';

/**
 * Pure transformation pipeline converting raw EventRecord[] to formatted TranscriptLine[].
 *
 * The transcript builder is stateless: it takes a Conversation and an array of already-fetched
 * EventRecord instances, applies an allow-list filter (D27/Q7), formats each event according
 * to the Wire transcript format specification (D9), and returns a time-sorted array.
 *
 * All timestamps are formatted from UTC ISO-8601 strings stored in IndexedDB. Local timezone
 * conversion is NOT performed — `date-fns format()` will display times in the runtime's local
 * offset; for consistency in testing and production use a UTC environment or normalize before display.
 *
 * @see D9 for transcript format rules
 * @see D27 for the event allow-list specification
 * @see Q7 (R1) for the allowed event type decision rationale
 */

/**
 * A single formatted line in a conversation transcript, produced by buildTranscriptLines.
 * See D9 for format rules.
 */
export interface TranscriptLine {
  time: Date;
  text: string;
  isSystem: boolean;
}

/** Event types included in the transcript (Q&A R1 Q7 / D27). */
export const INCLUDED_EVENT_TYPES = new Set<string>([
  'conversation.message-add',
  'conversation.asset-add',
  'conversation.member-join',
  'conversation.member-leave',
  'conversation.rename',
  'conversation.message-delete',
]);

/** Formats an ISO timestamp to 'yyyy-MM-dd HH:mm' for transcript output (D9). Times are UTC. */
const fmtTime = (iso: string): string => {
  const d = new Date(iso);
  return format(d, 'yyyy-MM-dd HH:mm');
};

interface ParticipantLookup {
  (userId: string): {handle?: string; name?: string} | undefined;
}

const labelFor = (lookup: ParticipantLookup, userId: string): string => {
  const u = lookup(userId);
  if (!u) {
    return `@unknown(${userId.slice(0, 8)})`;
  }
  if (u.handle) {
    return `@${u.handle}`;
  }
  if (u.name) {
    return u.name;
  }
  return `@unknown(${userId.slice(0, 8)})`;
};

/**
 * Converts raw EventRecord[] into formatted TranscriptLine[]. Only processes types in
 * INCLUDED_EVENT_TYPES (D27). Output is sorted ascending by time.
 * @see D9 for format rules.
 */
export const buildTranscriptLines = (conversation: Conversation, events: EventRecord[]): TranscriptLine[] => {
  const users = conversation.participating_user_ets();
  const lookup: ParticipantLookup = (id: string) => {
    const u = users.find(x => x.id === id);
    if (!u) {
      return undefined;
    }
    return {handle: u.handle, name: u.name?.()};
  };

  const lines: TranscriptLine[] = [];
  for (const e of events) {
    if (!INCLUDED_EVENT_TYPES.has(e.type)) {
      continue;
    }
    const date = new Date(e.time);
    const t = fmtTime(e.time);
    const author = labelFor(lookup, e.from);

    if (e.type === 'conversation.message-add') {
      const data = (e.data ?? {}) as {content?: string; edited_time?: string};
      const text = data.content ?? '';
      const suffix = data.edited_time ? ' (edited)' : '';
      lines.push({time: date, text: `[${t}] ${author}: ${text}${suffix}`, isSystem: false});
    } else if (e.type === 'conversation.asset-add') {
      const data = (e.data ?? {}) as {info?: {name?: string}};
      const filename = data.info?.name ?? 'file';
      lines.push({time: date, text: `[${t}] ${author}: [attachment: ${filename}]`, isSystem: false});
    } else if (e.type === 'conversation.member-join') {
      const data = (e.data ?? {}) as {user_ids?: string[]};
      const added = (data.user_ids ?? []).map(id => labelFor(lookup, id)).join(', ');
      lines.push({time: date, text: `[${t}] -- ${author} added ${added} --`, isSystem: true});
    } else if (e.type === 'conversation.member-leave') {
      const data = (e.data ?? {}) as {user_ids?: string[]};
      const removed = (data.user_ids ?? []).map(id => labelFor(lookup, id)).join(', ');
      lines.push({time: date, text: `[${t}] -- ${author} removed ${removed} --`, isSystem: true});
    } else if (e.type === 'conversation.rename') {
      const data = (e.data ?? {}) as {name?: string};
      lines.push({
        time: date,
        text: `[${t}] -- ${author} renamed conversation to "${data.name ?? ''}" --`,
        isSystem: true,
      });
    } else if (e.type === 'conversation.message-delete') {
      lines.push({time: date, text: `[${t}] -- ${author} deleted a message --`, isSystem: true});
    }
  }
  return lines.sort((a, b) => a.time.getTime() - b.time.getTime());
};

/** Joins transcript lines into a single newline-delimited string suitable for inclusion in an LLM prompt. */
export const transcriptLinesToString = (lines: TranscriptLine[]): string => lines.map(l => l.text).join('\n');
