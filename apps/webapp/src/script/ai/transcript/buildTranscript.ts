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

/** A single formatted transcript line with metadata. */
export interface TranscriptLine {
  time: Date;
  text: string;
  isSystem: boolean;
}

/** Event types included in AI transcripts (D27 / Q&A R1 Q7). All others are silently dropped. */
export const INCLUDED_EVENT_TYPES = new Set<string>([
  'conversation.message-add',
  'conversation.asset-add',
  'conversation.member-join',
  'conversation.member-leave',
  'conversation.rename',
  'conversation.message-delete',
]);

const fmtTime = (iso: string): string => format(new Date(iso), 'yyyy-MM-dd HH:mm');

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

/** Minimal self-user info needed so the local user's messages are labelled correctly in the transcript. */
export interface SelfUserInfo {
  id: string;
  name: string;
  handle: string;
}

/**
 * Converts an array of EventRecords into formatted TranscriptLines.
 * Filters to INCLUDED_EVENT_TYPES, formats each line per D9, sorts ascending by time.
 * Pass selfUser so that messages sent by the local user are labelled by name rather than @unknown.
 */
export const buildTranscriptLines = (
  conversation: Conversation,
  events: EventRecord[],
  selfUser?: SelfUserInfo,
): TranscriptLine[] => {
  const users = conversation.participating_user_ets();
  const lookup: ParticipantLookup = (id: string) => {
    if (selfUser && id === selfUser.id) {
      return {handle: selfUser.handle, name: selfUser.name};
    }
    const u = users.find(x => x.id === id);
    if (!u) {
      return undefined;
    }
    return {handle: (u as {handle?: string}).handle, name: (u.name as (() => string) | undefined)?.()};
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

/** Joins transcript lines into a single string (one line per message). */
export const transcriptLinesToString = (lines: TranscriptLine[]): string => lines.map(l => l.text).join('\n');
