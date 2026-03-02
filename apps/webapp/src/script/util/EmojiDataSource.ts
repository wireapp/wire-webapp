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

import is from '@sindresorhus/is';

export type EmojiDataEntry = {
  n: string[];
  u: string;
};

type GenericRecord = Record<string, unknown>;
type EmojiEntriesByCategory = Record<string, EmojiDataEntry[]>;

function isGenericRecord(value: unknown): value is GenericRecord {
  return is.object(value) && !is.array(value);
}

function isEmojiDataEntry(value: unknown): value is EmojiDataEntry {
  if (!isGenericRecord(value)) {
    return false;
  }

  return is.string(value.u) && is.array(value.n) && value.n.every(is.string);
}

function isEmojiDataEntryList(value: unknown): value is EmojiDataEntry[] {
  return is.array(value) && value.every(isEmojiDataEntry);
}

function isEmojiEntriesByCategory(value: unknown): value is EmojiEntriesByCategory {
  if (!isGenericRecord(value)) {
    return false;
  }

  return Object.values(value).every(isEmojiDataEntryList);
}

function flattenEmojiEntriesByCategory(emojiEntriesByCategory: EmojiEntriesByCategory): EmojiDataEntry[] {
  return Object.values(emojiEntriesByCategory).flat();
}

export function extractEmojiDataEntries(emojiDataSource: unknown): EmojiDataEntry[] {
  if (!isGenericRecord(emojiDataSource)) {
    return [];
  }

  if (isEmojiEntriesByCategory(emojiDataSource.emojis)) {
    return flattenEmojiEntriesByCategory(emojiDataSource.emojis);
  }

  if (isEmojiEntriesByCategory(emojiDataSource)) {
    return flattenEmojiEntriesByCategory(emojiDataSource);
  }

  return [];
}
