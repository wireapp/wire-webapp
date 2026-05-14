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

import type {ReportStatus} from '../../domain/ReportStatus';

/** Top-level record for a single AI scan run. */
export interface AiReportRecord {
  id: string; // uuid
  created_at: string; // ISO
  finished_at: string | null; // ISO when finished/failed/interrupted
  status: ReportStatus;
  /** ordered list of conversation IDs that this scan run targeted; locked at scan-start */
  target_conversation_ids: string[];
  final_pass_started_at: string | null;
  final_pass_finished_at: string | null;
  /** snapshot of settings at scan-start so a re-render months later still makes sense */
  snapshot: {
    model: string;
    context_size: number;
    safety_margin_pct: number;
    per_message_token_cap: number;
    job_description: string;
  };
  error: string | null;
}
