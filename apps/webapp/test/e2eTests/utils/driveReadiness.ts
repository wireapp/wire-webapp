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
import {getRequiredUserId} from '../data/user';
import type {User} from '../data/user';
import type {ApiManagerE2E} from '../backend/apiManager.e2e';

// Temporary E2E mitigation for WPB-30484; remove under WPB-30485 after WPB-30454 is verified.
export const DRIVE_READINESS_TIMEOUT_MS = 60_000;
const DEFAULT_POLL_INTERVAL_MS = 1_000;

type CellsStateReader = (conversationId: string, timeoutMs: number) => Promise<CONVERSATION_CELLS_STATE>;

type WaitOptions = {
  timeoutMs?: number;
  deadlineMs?: number;
  pollIntervalMs?: number;
  now?: () => number;
  pause?: (durationMs: number) => Promise<void>;
};

const pause = (durationMs: number): Promise<void> => {
  return new Promise(resolve => {
    return setTimeout(resolve, durationMs);
  });
};

export const waitForDriveConversationReady = async (
  api: ApiManagerE2E,
  owner: User,
  member: User,
  conversationName: string,
): Promise<void> => {
  const memberId = getRequiredUserId(member);
  const deadlineMs = Date.now() + DRIVE_READINESS_TIMEOUT_MS;
  const getRemainingTimeoutMs = (): number => {
    return deadlineMs - Date.now();
  };
  let conversationId: string | undefined;

  try {
    conversationId = await api.conversation.getQualifiedGroupConversation(
      owner.token,
      conversationName,
      memberId,
      getRemainingTimeoutMs,
    );
  } catch (error) {
    if (getRemainingTimeoutMs() <= 0) {
      throw new Error(
        `Timed out waiting for Cells readiness for conversation "${conversationName}" (member ${memberId}); last known state: unknown.`,
      );
    }
    const detail = error instanceof Error ? ` ${error.message}` : '';
    throw new Error(
      `Failed to find conversation "${conversationName}" for member ${memberId}; last known state: unknown.${detail}`,
    );
  }

  if (!conversationId) {
    throw new Error(
      `Could not find conversation "${conversationName}" for member ${memberId}; last known state: unknown.`,
    );
  }

  await waitForCellsReady(
    conversationId,
    (id, timeoutMs) => {
      return api.conversation.getCellsState(owner.token, id, timeoutMs);
    },
    {deadlineMs},
  );
};

export const waitForCellsReady = async (
  conversationId: string,
  readState: CellsStateReader,
  options: WaitOptions = {},
): Promise<void> => {
  const timeoutMs = options.timeoutMs ?? DRIVE_READINESS_TIMEOUT_MS;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const now = options.now ?? Date.now;
  const wait = options.pause ?? pause;
  const deadline = options.deadlineMs ?? now() + timeoutMs;
  let lastKnownState: CONVERSATION_CELLS_STATE | undefined;
  const timeoutError = (): Error => {
    return new Error(
      `Timed out waiting for Cells readiness for conversation ${conversationId}; last known state: ${lastKnownState ?? 'unknown'}.`,
    );
  };

  while (true) {
    const remainingMs = deadline - now();
    if (remainingMs <= 0) throw timeoutError();

    try {
      lastKnownState = await readState(conversationId, remainingMs);
    } catch (error) {
      if (now() >= deadline) throw timeoutError();
      const detail = error instanceof Error ? ` ${error.message}` : '';
      throw new Error(
        `Failed to read Cells state for conversation ${conversationId}; last known state: ${lastKnownState ?? 'unknown'}.${detail}`,
      );
    }

    const remainingAfterReadMs = deadline - now();
    if (remainingAfterReadMs <= 0) throw timeoutError();
    if (lastKnownState === CONVERSATION_CELLS_STATE.READY) return;

    await wait(Math.min(pollIntervalMs, remainingAfterReadMs));
  }
};
