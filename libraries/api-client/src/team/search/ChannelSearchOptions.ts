/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {SortOrder} from './TeamSearchOptions';

export interface ChannelSearchOptions {
  /** The query string, to be used to match with the name of the channel. When not provided, the search would return the first page of the list. */
  q?: string;
  /** Sort order: "asc" or "desc" */
  sort_order?: SortOrder;
  /** The desired number of results */
  page_size?: number;
  /** Name of the last channel of the previous page (required for pages after the first) */
  last_seen_name?: string;
  /** Id of the last channel of the previous page (required for pages after the first) */
  last_seen_id?: string;
  /** If true only finds public channels. Team settings should set this to false, other clients should set this to true. */
  discoverable?: boolean;
}
