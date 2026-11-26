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
 */

import {CONVERSATION_CELLS_STATE} from '../../../src/script/apiClient/conversation/conversation';

import {waitForCellsReady} from './driveReadiness';

import {expect, test} from '@playwright/test';

test.describe('waitForCellsReady', () => {
  test('returns when the exact conversation is already ready', async () => {
    let readConversationId = '';

    await waitForCellsReady(
      'conversation-ready',
      async (conversationId): Promise<CONVERSATION_CELLS_STATE> => {
        readConversationId = conversationId;
        return CONVERSATION_CELLS_STATE.READY;
      },
      {
        timeoutMs: 10,
        now: () => {
          return 0;
        },
      },
    );

    expect(readConversationId).toBe('conversation-ready');
  });

  test('keeps checking the exact conversation while it is pending', async () => {
    const states = [CONVERSATION_CELLS_STATE.PENDING, CONVERSATION_CELLS_STATE.READY];
    const readConversationIds: string[] = [];
    const requestTimeouts: number[] = [];
    const readState = async (conversationId: string, timeoutMs: number): Promise<CONVERSATION_CELLS_STATE> => {
      readConversationIds.push(conversationId);
      requestTimeouts.push(timeoutMs);
      return states.shift() ?? CONVERSATION_CELLS_STATE.READY;
    };
    let elapsedMs = 0;

    await waitForCellsReady('conversation-123', readState, {
      timeoutMs: 10,
      pollIntervalMs: 5,
      now: () => {
        return elapsedMs;
      },
      pause: async durationMs => {
        elapsedMs += durationMs;
      },
    });

    expect(states).toHaveLength(0);
    expect(readConversationIds).toEqual(['conversation-123', 'conversation-123']);
    expect(requestTimeouts).toEqual([10, 5]);
  });

  test('times out with the conversation id and last known state', async () => {
    let elapsedMs = 0;

    await expect(
      waitForCellsReady(
        'conversation-456',
        async () => {
          return CONVERSATION_CELLS_STATE.PENDING;
        },
        {
          timeoutMs: 10,
          pollIntervalMs: 5,
          now: () => {
            return elapsedMs;
          },
          pause: async durationMs => {
            elapsedMs += durationMs;
          },
        },
      ),
    ).rejects.toThrow(
      'Timed out waiting for Cells readiness for conversation conversation-456; last known state: pending.',
    );
  });

  test('times out if the state request consumes the remaining deadline', async () => {
    let elapsedMs = 0;

    await expect(
      waitForCellsReady(
        'conversation-slow',
        async (_conversationId, timeoutMs) => {
          elapsedMs += timeoutMs;
          return CONVERSATION_CELLS_STATE.READY;
        },
        {
          timeoutMs: 10,
          now: () => {
            return elapsedMs;
          },
        },
      ),
    ).rejects.toThrow(
      'Timed out waiting for Cells readiness for conversation conversation-slow; last known state: ready.',
    );
  });

  test('reports an unknown state when the backend response has no state', async () => {
    let elapsedMs = 0;

    await expect(
      waitForCellsReady(
        'conversation-unknown',
        async () => {
          return undefined as unknown as CONVERSATION_CELLS_STATE;
        },
        {
          timeoutMs: 10,
          pollIntervalMs: 5,
          now: () => {
            return elapsedMs;
          },
          pause: async durationMs => {
            elapsedMs += durationMs;
          },
        },
      ),
    ).rejects.toThrow(
      'Timed out waiting for Cells readiness for conversation conversation-unknown; last known state: unknown.',
    );
  });

  test('adds conversation and last known state to state-read errors', async () => {
    await expect(
      waitForCellsReady('conversation-error', async () => {
        throw new Error('backend unavailable');
      }),
    ).rejects.toThrow(
      'Failed to read Cells state for conversation conversation-error; last known state: unknown. backend unavailable',
    );
  });
});
