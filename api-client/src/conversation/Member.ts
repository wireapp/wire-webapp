/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {MutedStatus, ServiceRef} from '../conversation/';

export interface Member {
  conversation_role?: string;
  hidden?: boolean;
  hidden_ref: string | null;
  id: string;
  otr_archived?: boolean;
  otr_archived_ref: string | null;
  otr_muted: boolean | null;
  otr_muted_ref: string | null;
  otr_muted_status: MutedStatus | null;
  service: ServiceRef | null;
  status_ref: string;
  status_time: string;
}
