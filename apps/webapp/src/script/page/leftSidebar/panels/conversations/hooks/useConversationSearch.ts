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

import {KeyboardEvent, useCallback, useEffect, useRef, useState} from 'react';

import type {Clock} from '@enormora/clock/clock';

type SearchEvent = KeyboardEvent<HTMLInputElement>;
type PendingAction = {kind: 'enter' | 'tab'; event: SearchEvent; query: string};

type ConversationSearchOptions = {
  clock: Clock;
  filter: string;
  onSearch: (value: string) => void;
  onEnter: (event: SearchEvent) => boolean;
  onTab: (event: SearchEvent) => void;
  hasTabResult: (query: string) => boolean;
  onBeforeTab: () => void;
};

const SEARCH_DELAY_IN_MILLISECONDS = 200;

type UseConversationSearchResult = {
  inputValue: string;
  changeInput: (value: string) => void;
  clear: () => void;
  enter: (event: SearchEvent) => void;
  tab: (event: SearchEvent) => void;
};
export const useConversationSearch = ({
  clock,
  filter,
  onSearch,
  onEnter,
  onTab,
  hasTabResult,
  onBeforeTab,
}: ConversationSearchOptions): UseConversationSearchResult => {
  const [inputValue, setInputValue] = useState(filter);
  const pendingAction = useRef<PendingAction | null>(null);
  useEffect(() => {
    if (inputValue.length === 0 || inputValue === filter) {
      return;
    }

    const timeout = clock.setTimeout(() => {
      return onSearch(inputValue);
    }, SEARCH_DELAY_IN_MILLISECONDS);
    return () => {
      return clock.clearTimeout(timeout);
    };
  }, [clock, filter, inputValue, onSearch]);

  const clear = useCallback(() => {
    pendingAction.current = null;
    setInputValue('');
    onSearch('');
  }, [onSearch]);

  const changeInput = useCallback(
    (value: string) => {
      setInputValue(value);
      if (value.length === 0) {
        pendingAction.current = null;
        onSearch('');
      }
    },
    [onSearch],
  );

  const enter = useCallback(
    (event: SearchEvent) => {
      if (inputValue !== filter) {
        event.preventDefault();
        pendingAction.current = {kind: 'enter', event, query: inputValue};
        onSearch(inputValue);
        return;
      }

      if (onEnter(event)) {
        clear();
      }
    },
    [clear, filter, inputValue, onEnter, onSearch],
  );

  const tab = useCallback(
    (event: SearchEvent) => {
      const hasPendingQuery = inputValue !== filter;
      if (hasPendingQuery && hasTabResult(inputValue)) {
        event.preventDefault();
      }

      onBeforeTab();
      if (hasPendingQuery) {
        pendingAction.current = {kind: 'tab', event, query: inputValue};
        onSearch(inputValue);
        return;
      }

      onTab(event);
    },
    [filter, hasTabResult, inputValue, onBeforeTab, onSearch, onTab],
  );

  useEffect(() => {
    const action = pendingAction.current;
    if (action === null || action.query !== filter || action.query !== inputValue) {
      return;
    }

    pendingAction.current = null;
    if (action.kind === 'enter') {
      if (onEnter(action.event)) {
        clear();
      }
      return;
    }

    onTab(action.event);
  }, [clear, filter, inputValue, onEnter, onTab]);

  return {inputValue, changeInput, clear, enter, tab};
};
