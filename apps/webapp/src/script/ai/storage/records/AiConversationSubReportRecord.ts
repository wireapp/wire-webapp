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

import type {Entry} from '../../domain/EntryTypes';

export type SubReportStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped';

export interface AiConversationSubReportRecord {
  primary_key?: number; // dexie auto-increment
  id: string; // uuid (so we can deep-link)
  report_id: string;
  conversation_id: string;
  conversation_domain: string | null;
  conversation_name_snapshot: string;
  ai_description_snapshot: string;
  status: SubReportStatus;
  error: string | null;
  /** parsed + zod-validated tool-call output */
  entries: Entry[];
  stats: {
    raw_token_estimate: number;
    truncated_token_estimate: number;
    message_count_before_truncation: number;
    message_count_after_truncation: number;
    started_at: string | null;
    finished_at: string | null;
  };
  created_at: string;
}
