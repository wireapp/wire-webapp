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

import {CALL_MESSAGE_TYPE} from './enum/CallMessageType';
import {isIncomingSetupOffer, shouldRejectStaleIncomingRing} from './incomingCallInvite';

const lifetimeMs = 30_000;
const setupReceivedAtMs = 1_700_000_000_000;

describe('isIncomingSetupOffer', () => {
  it('accepts a SETUP offer', () => {
    expect(isIncomingSetupOffer({type: CALL_MESSAGE_TYPE.SETUP, version: '3.0', resp: false})).toBe(true);
  });

  it('rejects a SETUP answer', () => {
    expect(isIncomingSetupOffer({type: CALL_MESSAGE_TYPE.SETUP, version: '3.0', resp: true})).toBe(false);
  });

  it('rejects a SETUP without resp', () => {
    expect(isIncomingSetupOffer({type: CALL_MESSAGE_TYPE.SETUP, version: '3.0'})).toBe(false);
  });

  it('rejects conference start', () => {
    expect(isIncomingSetupOffer({type: CALL_MESSAGE_TYPE.CONF_START, version: '3.0'})).toBe(false);
  });
});

describe('shouldRejectStaleIncomingRing', () => {
  it('does not reject when AVS is not asking to ring', () => {
    expect(
      shouldRejectStaleIncomingRing({
        shouldRing: false,
        incomingSetupReceivedAtMs: Maybe.just(setupReceivedAtMs),
        nowMs: setupReceivedAtMs + lifetimeMs + 1,
        lifetimeMs,
      }),
    ).toBe(false);
  });

  it('does not reject when no incoming SETUP was recorded', () => {
    expect(
      shouldRejectStaleIncomingRing({
        shouldRing: true,
        incomingSetupReceivedAtMs: Maybe.nothing(),
        nowMs: setupReceivedAtMs + lifetimeMs + 1,
        lifetimeMs,
      }),
    ).toBe(false);
  });

  it('does not reject when the SETUP is still within the lifetime', () => {
    expect(
      shouldRejectStaleIncomingRing({
        shouldRing: true,
        incomingSetupReceivedAtMs: Maybe.just(setupReceivedAtMs),
        nowMs: setupReceivedAtMs + lifetimeMs,
        lifetimeMs,
      }),
    ).toBe(false);
  });

  it('rejects when AVS asks to ring after the SETUP lifetime', () => {
    expect(
      shouldRejectStaleIncomingRing({
        shouldRing: true,
        incomingSetupReceivedAtMs: Maybe.just(setupReceivedAtMs),
        nowMs: setupReceivedAtMs + lifetimeMs + 1,
        lifetimeMs,
      }),
    ).toBe(true);
  });
});
