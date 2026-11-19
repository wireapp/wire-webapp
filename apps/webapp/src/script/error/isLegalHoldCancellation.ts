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

import {isObject} from '@sindresorhus/is';

import {ConversationError} from './conversationError';

export function isLegalHoldCancellation(reason: unknown): boolean {
  return (
    isObject(reason) && 'type' in reason && reason.type === ConversationError.TYPE.LEGAL_HOLD_CONVERSATION_CANCELLATION
  );
}
