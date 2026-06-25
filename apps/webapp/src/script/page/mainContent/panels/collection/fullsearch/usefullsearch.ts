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

import {Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState} from 'react';

import is from '@sindresorhus/is';
import debounceFn from 'debounce-fn';

import type {ContentMessage} from 'Repositories/entity/message/contentmessage';
import type {Message} from 'Repositories/entity/message/message';

type SearchProviderResult = {messageEntities: Message[]; query: string};

export type FullSearchProvider = (query: string, abortSignal?: AbortSignal) => Promise<SearchProviderResult>;

type UseFullSearchOptions = {
  change: (query: string) => void;
  debounceMilliseconds: number;
  initialMessageCount: number;
  minimumSearchLength: number;
  searchProvider: FullSearchProvider;
};

type UseFullSearchResult = {
  hasNoResults: boolean;
  messageCount: number;
  messages: ContentMessage[];
  searchValue: string;
  setMessageCount: Dispatch<SetStateAction<number>>;
  updateSearchValue: (value: string) => void;
};

function isAbortError(error: unknown) {
  if (!is.error(error)) {
    return false;
  }

  return error.name === 'AbortError';
}

export function useFullSearch(options: UseFullSearchOptions): UseFullSearchResult {
  const {change, debounceMilliseconds, initialMessageCount, minimumSearchLength, searchProvider} = options;
  const [searchValue, setSearchValue] = useState('');
  const [messages, setMessages] = useState<ContentMessage[]>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [hasNoResults, setHasNoResults] = useState(false);

  const latestSearchQueryRef = useRef('');
  const latestSearchIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | undefined>();
  const searchProviderRef = useRef(searchProvider);

  useEffect(() => {
    searchProviderRef.current = searchProvider;
  }, [searchProvider]);

  const clearSearchResults = useCallback(() => {
    setMessages([]);
    setMessageCount(0);
    setHasNoResults(false);
  }, []);

  const abortCurrentSearch = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = undefined;
  }, []);

  const runSearch = useCallback(
    async (query: string) => {
      abortCurrentSearch();

      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const searchId = latestSearchIdRef.current + 1;
      latestSearchIdRef.current = searchId;

      try {
        const {messageEntities, query: resolvedQuery} = await searchProviderRef.current(query, abortController.signal);
        const isLatestSearch =
          !abortController.signal.aborted &&
          latestSearchIdRef.current === searchId &&
          latestSearchQueryRef.current === resolvedQuery;

        if (!isLatestSearch) {
          return;
        }

        setHasNoResults(messageEntities.length === 0);
        setMessages(messageEntities as ContentMessage[]);
        setMessageCount(initialMessageCount);
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        throw error;
      } finally {
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = undefined;
        }
      }
    },
    [abortCurrentSearch, initialMessageCount],
  );

  const debouncedRunSearch = useMemo(() => {
    return debounceFn(
      (query: string) => {
        void runSearch(query);
      },
      {wait: debounceMilliseconds},
    );
  }, [debounceMilliseconds, runSearch]);

  useEffect(() => {
    return () => {
      debouncedRunSearch.cancel();
      abortCurrentSearch();
    };
  }, [abortCurrentSearch, debouncedRunSearch]);

  const updateSearchValue = useCallback(
    (value: string) => {
      const normalizedQuery = value.trim();
      setSearchValue(value);
      latestSearchQueryRef.current = normalizedQuery;
      change(normalizedQuery);

      if (normalizedQuery.length < minimumSearchLength) {
        latestSearchIdRef.current += 1;
        debouncedRunSearch.cancel();
        abortCurrentSearch();
        clearSearchResults();
        return;
      }

      debouncedRunSearch(normalizedQuery);
    },
    [abortCurrentSearch, change, clearSearchResults, debouncedRunSearch, minimumSearchLength],
  );

  return {
    hasNoResults,
    messageCount,
    messages,
    searchValue,
    setMessageCount,
    updateSearchValue,
  };
}
