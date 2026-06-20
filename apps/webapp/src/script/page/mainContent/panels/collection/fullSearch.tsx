/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {useEffect, useMemo, useRef, useState} from 'react';

import {CSSObject} from '@emotion/react';
import {useDebouncedCallback} from 'use-debounce';

import {CloseIcon, Input, InputSubmitCombo, SearchIcon} from '@wireapp/react-ui-kit';

import {ContentMessage} from 'Repositories/entity/message/contentMessage';
import type {Message} from 'Repositories/entity/message/message';
import {getSearchRegex} from 'Repositories/search/fullTextSearch';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {isScrolledBottom} from 'Util/scrollHelpers';
import {useEffectRef} from 'Util/useEffectRef';
import {noop} from 'Util/util';

import {FullSearchItem} from './fullSearch/fullSearchItem';

const MAX_VISIBLE_MESSAGES = 30;
const PRE_MARKED_OFFSET = 20;
const MAX_TEXT_LENGTH = 60;
const MAX_OFFSET_INDEX = 30;
const DEBOUNCE_TIME = 500;
const MINIMUM_SEARCH_LENGTH = 2;

export const fullSearchInputSubmitComboStyles: CSSObject = {
  padding: '0 16px',
  marginBottom: '20px',
};

export const fullSearchInputWrapperStyles: CSSObject = {
  marginBottom: 0,
  width: '100%',
  '> div': {
    width: '100%',
  },
  '.wireinput': {
    boxShadow: 'none',
    marginRight: 0,
    '&:focus, &:focus-visible, &:hover, &:active, &:invalid:not(:focus)': {
      boxShadow: 'none',
    },
  },
};

interface FullSearchProps {
  change?: (query: string) => void;
  click?: (messageEntity: Message) => void;
  searchProvider: (query: string) => Promise<{messageEntities: Message[]; query: string}>;
}

const FullSearch = ({searchProvider, click = noop, change = noop}: FullSearchProps) => {
  const {translate} = useApplicationContext();
  const [searchValue, setSearchValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const latestSearchValueRef = useRef(searchValue);
  const isSearchingRef = useRef(false);
  const pendingSearchValueRef = useRef<string | undefined>();
  const [messages, setMessages] = useState<ContentMessage[]>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [hasNoResults, setHasNoResults] = useState(false);
  const [element, setElement] = useEffectRef<HTMLDivElement>();

  const search = async (value: string) => {
    if (isSearchingRef.current) {
      pendingSearchValueRef.current = value;
      return;
    }

    try {
      isSearchingRef.current = true;
      let nextSearchValue = value;

      while (true) {
        const trimmedInput = nextSearchValue.trim();
        pendingSearchValueRef.current = undefined;
        change(trimmedInput);

        if (trimmedInput.length < MINIMUM_SEARCH_LENGTH) {
          if (latestSearchValueRef.current.trim() === trimmedInput) {
            setMessages([]);
            setMessageCount(0);
            setHasNoResults(false);
          }
        } else {
          const {messageEntities, query} = await searchProvider(trimmedInput);
          if (query === trimmedInput && latestSearchValueRef.current.trim() === trimmedInput) {
            setHasNoResults(messageEntities.length === 0);
            setMessages(messageEntities as ContentMessage[]);
            setMessageCount(MAX_VISIBLE_MESSAGES);
          }
        }

        const pendingSearchValue = pendingSearchValueRef.current as string | undefined;
        if (pendingSearchValue === undefined || pendingSearchValue.trim() === trimmedInput) {
          break;
        }
        nextSearchValue = pendingSearchValue;
      }
    } finally {
      isSearchingRef.current = false;
    }
  };

  const debouncedSearch = useDebouncedCallback(search, DEBOUNCE_TIME);

  useEffect(() => {
    latestSearchValueRef.current = searchValue;
    debouncedSearch(searchValue);
  }, [debouncedSearch, searchValue]);

  useEffect(() => {
    const parent = element?.closest('.collection-list') as HTMLDivElement;
    const onScroll = () => {
      const showAdditionalMessages = isScrolledBottom(parent) && messages.length;
      if (showAdditionalMessages) {
        setMessageCount(currentCount => currentCount + MAX_VISIBLE_MESSAGES);
      }
    };
    parent?.addEventListener('scroll', onScroll);
    return () => {
      parent?.removeEventListener('scroll', onScroll);
    };
  }, [element, messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const formatSearchResult = useMemo(() => {
    const regex = getSearchRegex(searchValue);

    return (text: string) => {
      const matches = [...text.matchAll(regex)];
      const firstIndex = matches[0]?.index;
      let firstPart = text.substring(0, firstIndex ?? text.length);
      if (firstIndex && firstIndex > MAX_OFFSET_INDEX && text.length > MAX_TEXT_LENGTH) {
        let splitOffset = firstIndex - 1;
        const firstSpace = firstPart.indexOf(' ', splitOffset - PRE_MARKED_OFFSET);
        splitOffset = firstSpace > -1 ? firstSpace : splitOffset;
        firstPart = `…${firstPart.substring(splitOffset)}`;
      }
      const parts = matches.reduce(
        (accumulator, match, matchIndex) => [
          ...accumulator,
          match[0],
          text.substring((match.index ?? 0) + match[0].length, matches[matchIndex + 1]?.index ?? text.length),
        ],
        [firstPart],
      );

      return {matches: matches.length, parts};
    };
  }, [searchValue]);

  return (
    <div className="full-search" ref={setElement}>
      <header>
        <InputSubmitCombo css={fullSearchInputSubmitComboStyles}>
          <SearchIcon />

          <Input
            wrapperCSS={fullSearchInputWrapperStyles}
            type="text"
            value={searchValue}
            ref={inputRef}
            aria-label={translate('fullsearchPlaceholder')}
            placeholder={translate('fullsearchPlaceholder')}
            onChange={event => setSearchValue(event.currentTarget.value)}
            data-uie-name="full-search-header-input"
          />

          {searchValue && (
            <CloseIcon
              css={{cursor: 'pointer'}}
              data-uie-name="full-search-dismiss"
              aria-label={translate('fullsearchCancelCloseBtn')}
              onClick={() => setSearchValue('')}
            />
          )}
        </InputSubmitCombo>
      </header>

      {hasNoResults && (
        <p className="full-search__no-result" data-uie-name="full-search-no-results">
          {translate('fullsearchNoResults')}
        </p>
      )}

      <div className="full-search__list" data-uie-name="full-search-list">
        {messages.slice(0, messageCount).map(message => (
          <FullSearchItem
            key={message.id}
            message={message}
            onClick={() => click(message)}
            formatText={formatSearchResult}
          />
        ))}
      </div>
    </div>
  );
};

export {FullSearch};
