/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {QualifiedId} from '../user';

export enum SUBCONVERSATION_ID {
  CONFERENCE = 'conference',
}

interface SubconversationMember {
  client_id: string;
  domain: string;
  user_id: string;
}

export interface Subconversation {
  parent_qualified_id: QualifiedId;
  subconv_id: SUBCONVERSATION_ID;
  group_id: string;
  epoch: number;
  epoch_timestamp: string;
  cipher_suite: number;
  members: SubconversationMember[];
}
