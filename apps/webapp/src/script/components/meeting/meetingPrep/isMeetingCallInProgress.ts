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

import {STATE as CALL_STATE} from '@wireapp/avs';

import type {QualifiedId} from '../../../apiClient/user/qualifiedId';
import {matchQualifiedIds} from '../../../util/qualifiedId';

export interface CallSnapshot {
  readonly qualifiedConversationId: QualifiedId;
  readonly state: CALL_STATE;
}

/** States in which nobody is in the call any more, or not yet. */
const endedCallStates: ReadonlySet<CALL_STATE> = new Set([
  CALL_STATE.NONE,
  CALL_STATE.TERM_LOCAL,
  CALL_STATE.TERM_REMOTE,
  CALL_STATE.UNKNOWN,
]);

/**
 * Whether people are in the meeting's call right now: ringing for the user, already joined on this
 * device, or answered on another of the user's devices.
 */
export const isMeetingCallInProgress = (
  calls: readonly CallSnapshot[],
  qualifiedConversationId: QualifiedId,
): boolean => {
  return calls.some(call => {
    return matchQualifiedIds(call.qualifiedConversationId, qualifiedConversationId) && !endedCallStates.has(call.state);
  });
};
