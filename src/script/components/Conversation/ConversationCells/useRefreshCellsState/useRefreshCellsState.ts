/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {useCallback, useEffect, useRef, useState} from 'react';

import {CONVERSATION_CELLS_STATE} from '@wireapp/api-client/lib/conversation';
import {QualifiedId} from '@wireapp/api-client/lib/user';

import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';

const REFRESH_INTERVAL_MS = 10000;
const MAX_REFRESH_COUNT = 5;

// Refreshes the cells state in a interval when the state is PENDING
// Ensures that the cells state is always up to date and to avoid the user seeing a stale state
export const useRefreshCellsState = ({
  initialCellState,
  conversationRepository,
  conversationQualifiedId,
}: {
  initialCellState: CONVERSATION_CELLS_STATE;
  conversationRepository: ConversationRepository;
  conversationQualifiedId: QualifiedId;
}) => {
  const [cellsState, setCellsState] = useState(initialCellState);
  const [isRefreshing, setIsRefreshing] = useState(cellsState === CONVERSATION_CELLS_STATE.PENDING);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isInitialMount = useRef(true);
  const fetchCountRef = useRef(0);

  const refreshCellsState = useCallback(async () => {
    const conversation = await conversationRepository.getConversationById(conversationQualifiedId);
    setCellsState(conversation.cellsState());
    fetchCountRef.current += 1;
  }, [conversationRepository, conversationQualifiedId]);

  useEffect(() => {
    if (isInitialMount.current) {
      void refreshCellsState();
      isInitialMount.current = false;
      return undefined;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (cellsState !== CONVERSATION_CELLS_STATE.PENDING) {
      setIsRefreshing(false);
      return undefined;
    }

    if (fetchCountRef.current >= MAX_REFRESH_COUNT) {
      setIsRefreshing(false);
      return undefined;
    }

    intervalRef.current = setInterval(() => {
      if (fetchCountRef.current >= MAX_REFRESH_COUNT) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setIsRefreshing(false);
        return;
      }
      void refreshCellsState();
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [cellsState, refreshCellsState]);

  return {cellsState, isRefreshing};
};
