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

import {expect} from '@playwright/test';
import {CONVERSATION_CELLS_STATE} from '../../../src/script/apiClient/conversation/conversation';
import {getRequiredUserId} from '../data/user';
import type {User} from '../data/user';
import type {ApiManagerE2E} from '../backend/apiManager.e2e';

// Temporary E2E mitigation for WPB-30484; remove under WPB-30485 after WPB-30454 is verified.
export const DRIVE_READINESS_TIMEOUT_MS = 60_000;
const DEFAULT_POLL_INTERVAL_MS = 1_000;

type CellsStateReader = (conversationId: string, timeoutMs: number) => Promise<CONVERSATION_CELLS_STATE>;

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
    deadlineMs,
  );
};

const waitForCellsReady = async (
  conversationId: string,
  readState: CellsStateReader,
  deadlineMs: number,
): Promise<void> => {
  let lastKnownState: CONVERSATION_CELLS_STATE | undefined;
  const timeoutError = (): Error => {
    return new Error(
      `Timed out waiting for Cells readiness for conversation ${conversationId}; last known state: ${lastKnownState ?? 'unknown'}.`,
    );
  };
  const timeoutMs = deadlineMs - Date.now();
  if (timeoutMs <= 0) throw timeoutError();

  await expect
    .poll(
      async () => {
        const requestTimeoutMs = deadlineMs - Date.now();
        if (requestTimeoutMs <= 0) throw timeoutError();

        lastKnownState = await readState(conversationId, requestTimeoutMs);
        if (deadlineMs - Date.now() <= 0) throw timeoutError();

        return lastKnownState;
      },
      {
        timeout: timeoutMs,
        intervals: [DEFAULT_POLL_INTERVAL_MS],
        message: `Timed out waiting for Cells readiness for conversation ${conversationId}; last state is shown in the poll result.`,
      },
    )
    .toBe(CONVERSATION_CELLS_STATE.READY);
};
