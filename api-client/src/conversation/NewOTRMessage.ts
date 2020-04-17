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

import {OTRRecipients} from './';

export interface NewOTRMessage {
  /**
   * Extra (symmetric) data (i.e. ciphertext) that is replicated for each recipient.
   * Use `Uint8Array` for Protocol Buffer and `string` for JSON.
   */
  data?: Uint8Array | string;
  /** The native push priority (default `high`) */
  native_priority?: 'low' | 'high';
  /** Whether to issue a native push to offline clients */
  native_push?: boolean;
  recipients: OTRRecipients;
  report_missing?: string[];
  /** The sender's client ID */
  sender: string;
  /** Whether to put this message into the notification queue */
  transient?: boolean;
}
