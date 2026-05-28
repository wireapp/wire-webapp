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

/** A saved export — stores the user's selection and the last-generated markdown. */
export interface ExportRecord {
  id: string;           // uuid PK
  name: string;
  created_at: string;   // ISO
  updated_at: string;   // ISO
  selected_conversation_ids: string[];
  selected_jira_ticket_keys: string[];
  selected_analysis_entry_ids: string[];
  selected_todo_entry_ids: string[];
  selected_ticket_entry_ids: string[];
  /** Last-generated markdown, null until the user first clicks Export. */
  markdown: string | null;
}
