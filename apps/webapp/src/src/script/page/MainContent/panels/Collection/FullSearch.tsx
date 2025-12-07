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

import {useDebouncedCallback} from 'use-debounce';

import {CloseIcon, Input, InputSubmitCombo, SearchIcon} from '@wireapp/react-ui-kit';

import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import type {Message} from 'Repositories/entity/message/Message';
import {getSearchRegex} from 'Repositories/search/FullTextSearch';
import {t} from 'Util/LocalizerUtil';
import {isScrolledBottom} from 'Util/scroll-helpers';
import {useEffectRef} from 'Util/useEffectRef';
import {noop} from 'Util/util';

import {FullSearchItem} from './fullSearch/FullSearchItem';

const MAX_VISIBLE_MESSAGES = 30;
const PRE_MARKED_OFFSET = 20;
const MAX_TEXT_LENGTH = 60;
const MAX_OFFSET_INDEX = 30;
const DEBOUNCE_TIME = 100;

interface FullSearchProps {
  change?: (query: string) => void;
  click?: (messageEntity: Message) => void;
  searchProvider: (query: string) => Promise<{messageEntities: Message[]; query: string}>;
}

const FullSearch = ({searchProvider, click = noop, change = noop}: FullSearchProps) => {
  const [searchValue, setSearchValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<ContentMessage[]>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [hasNoResults, setHasNoResults] = useState(false);
  const [element, setElement] = useEffectRef<HTMLDivElement>();

  const debouncedSearch = useDebouncedCallback(async () => {
    const trimmedInput = searchValue.trim();
    change(trimmedInput);
    if (trimmedInput.length < 2) {
      setMessages([]);
      setMessageCount(0);
      setHasNoResults(false);
      return;
    }
    const {messageEntities, query} = await searchProvider(trimmedInput);
    if (query === trimmedInput) {
      setHasNoResults(messageEntities.length === 0);
      setMessages(messageEntities as ContentMessage[]);
      setMessageCount(MAX_VISIBLE_MESSAGES);
    }
  }, DEBOUNCE_TIME);

  useEffect(() => {
    debouncedSearch();
  }, [searchValue]);

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
        (acc, match, i) => [
          ...acc,
          match[0],
          text.substring((match.index ?? 0) + match[0].length, matches[i + 1]?.index ?? text.length),
        ],
        [firstPart],
      );

      return {matches: matches.length, parts};
    };
  }, [searchValue]);

  return (
    <div className="full-search" ref={setElement}>
      <header>
        <InputSubmitCombo css={{padding: '0 16px', marginBottom: '20px'}}>
          <SearchIcon />

          <Input
            wrapperCSS={{marginBottom: 0, width: '100%', '> div': {width: '100%'}}}
            type="text"
            value={searchValue}
            ref={inputRef}
            aria-label={t('fullsearchPlaceholder')}
            placeholder={t('fullsearchPlaceholder')}
            onChange={event => setSearchValue(event.currentTarget.value)}
            data-uie-name="full-search-header-input"
          />

          {searchValue && (
            <CloseIcon
              css={{cursor: 'pointer'}}
              data-uie-name="full-search-dismiss"
              aria-label={t('fullsearchCancelCloseBtn')}
              onClick={() => setSearchValue('')}
            />
          )}
        </InputSubmitCombo>
      </header>

      {hasNoResults && (
        <p className="full-search__no-result" data-uie-name="full-search-no-results">
          {t('fullsearchNoResults')}
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
