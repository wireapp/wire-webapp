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

export interface JiraStoredComment {
  id: string;
  author_id: string;
  author_name: string;
  created_at: string; // ISO
}

/** Snapshot of a Jira issue stored locally for rules evaluation and offline display. */
export interface JiraTicketRecord {
  key: string;                      // PK e.g. "WPB-25675"
  summary: string;
  status_name: string;
  status_category_color: string;    // "yellow" | "green" | "blue-grey" | "red"
  priority_name: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  story_points: number | null;
  labels: string[];
  issue_type_name: string;
  comments: JiraStoredComment[];    // populated for in-progress tickets
  comments_fetched: boolean;        // true when comments field is populated
  fetched_at: string;               // ISO — last full sync
  updated_at: string;               // from Jira
}
