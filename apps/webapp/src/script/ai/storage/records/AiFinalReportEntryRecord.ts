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

import type {EntryType, EntryPayload} from '../../domain/EntryTypes';

/** Single deduplicated output entry from the final-pass LLM call. */
export interface AiFinalReportEntryRecord {
  primary_key?: number;
  id: string; // uuid — stable across re-renders, used as React key
  report_id: string;
  type: EntryType; // 'report' | 'todo' | 'ticket'
  payload: EntryPayload;
  /** conversation IDs this entry was derived from */
  conversation_ids: string[];
  mutable_state: {
    checked?: boolean; // todo only
    title?: string; // ticket only override
    description?: string; // ticket only override
    notes?: string; // todo + ticket
  };
  created_at: string;
}
