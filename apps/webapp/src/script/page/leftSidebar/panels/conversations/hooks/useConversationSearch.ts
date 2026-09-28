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
  searchContextKey: string;
  setFilter: (value: string) => void;
  onSearch: (value: string) => void;
  onEnter: (event: SearchEvent) => boolean;
  onTab: (event: SearchEvent) => void;
  onBeforeTab: () => void;
};

const SEARCH_DELAY_IN_MILLISECONDS = 200;

export const useConversationSearch = ({
  clock,
  filter,
  searchContextKey,
  setFilter,
  onSearch,
  onEnter,
  onTab,
  onBeforeTab,
}: ConversationSearchOptions) => {
  const [inputValue, setInputValue] = useState(filter);
  const pendingAction = useRef<PendingAction | null>(null);
  const previousSearchContextKey = useRef(searchContextKey);

  useEffect(() => {
    if (previousSearchContextKey.current === searchContextKey) {
      return;
    }

    previousSearchContextKey.current = searchContextKey;
    pendingAction.current = null;
    setInputValue(filter);
  }, [filter, searchContextKey]);

  useEffect(() => {
    if (previousSearchContextKey.current !== searchContextKey || inputValue.length === 0 || inputValue === filter) {
      return;
    }

    const timeout = clock.setTimeout(() => onSearch(inputValue), SEARCH_DELAY_IN_MILLISECONDS);
    return () => clock.clearTimeout(timeout);
  }, [clock, filter, inputValue, onSearch, searchContextKey]);

  const clear = useCallback(() => {
    pendingAction.current = null;
    setInputValue('');
    setFilter('');
  }, [setFilter]);

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
      onBeforeTab();
      if (inputValue !== filter) {
        pendingAction.current = {kind: 'tab', event, query: inputValue};
        onSearch(inputValue);
        return;
      }

      onTab(event);
    },
    [filter, inputValue, onBeforeTab, onSearch, onTab],
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
