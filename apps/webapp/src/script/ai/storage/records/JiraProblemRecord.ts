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

export type JiraProblemStatus = 'active' | 'resolved';

/** A detected rule violation on a Jira ticket. Persists across sessions. */
export interface JiraProblemRecord {
  id?: number;              // auto-increment PK (optional so Dexie can set it on insert)
  ticket_key: string;       // FK → jira_tickets.key
  rule_id: string;          // stable identifier e.g. "in_progress_no_recent_comment"
  message: string;          // human-readable, may vary (e.g. includes bad label name)
  status: JiraProblemStatus;
  detected_at: string;      // ISO
  resolved_at: string | null;
}
