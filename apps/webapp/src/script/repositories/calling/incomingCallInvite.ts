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

import {Maybe} from 'true-myth';

import {CallingEvent} from 'Repositories/event/CallingEvent';

import {CALL_MESSAGE_TYPE} from './enum/CallMessageType';

export const isIncomingSetupOffer = (content: CallingEvent['content']): boolean =>
  content.type === CALL_MESSAGE_TYPE.SETUP && content.resp === false;

export const shouldRejectStaleIncomingRing = ({
  shouldRing,
  incomingSetupReceivedAtMs,
  nowMs,
  lifetimeMs,
}: {
  shouldRing: boolean;
  incomingSetupReceivedAtMs: Maybe<number>;
  nowMs: number;
  lifetimeMs: number;
}): boolean => {
  if (!shouldRing) {
    return false;
  }

  return incomingSetupReceivedAtMs.mapOr(false, receivedAtMs => nowMs - receivedAtMs > lifetimeMs);
};
