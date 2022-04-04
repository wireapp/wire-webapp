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

import React, {useEffect, useMemo, useRef, useState} from 'react';

import {registerReactComponent} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {noop} from 'Util/util';
import {isScrolledBottom} from 'Util/scroll-helpers';
import useEffectRef from 'Util/useEffectRef';

import type {Message} from '../../entity/message/Message';
import useDebounce from '../../hooks/useDebounce';
import {getSearchRegex} from '../../search/FullTextSearch';
import {ContentMessage} from '../../entity/message/ContentMessage';
import FullSearchItem from './fullSearch/FullSearchItem';

export interface FullSearchProps {
  change?: (query: string) => void;
  click?: (messageEntity: Message) => void;
  searchProvider: (query: string) => Promise<{messageEntities: Message[]; query: string}>;
}

const FullSearch: React.FC<FullSearchProps> = ({searchProvider, click = noop, change = noop}) => {
  const MAX_VISIBLE_MESSAGES = 30;
  const PRE_MARKED_OFFSET = 20;
  const MAX_TEXT_LENGTH = 60;
  const MAX_OFFSET_INDEX = 30;

  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>();
  const [messages, setMessages] = useState<ContentMessage[]>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [hasNoResults, setHasNoResults] = useState(false);
  const [element, setElement] = useEffectRef<HTMLDivElement>();

  useDebounce(
    async () => {
      const trimmedInput = input.trim();
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
    },
    100,
    [input],
  );

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
    const regex = getSearchRegex(input);

    return (text: string) => {
      const matches = [...text.matchAll(regex)];
      const firstIndex = matches[0]?.index;
      let firstPart = text.substring(0, firstIndex ?? text.length);
      if (firstIndex > MAX_OFFSET_INDEX && text.length > MAX_TEXT_LENGTH) {
        let splitOffset = firstIndex - 1;
        const firstSpace = firstPart.indexOf(' ', splitOffset - PRE_MARKED_OFFSET);
        splitOffset = firstSpace > -1 ? firstSpace : splitOffset;
        firstPart = `…${firstPart.substring(splitOffset)}`;
      }
      const parts = matches.reduce(
        (acc, match, i) => [
          ...acc,
          match[0],
          text.substring(match.index + match[0].length, matches[i + 1]?.index ?? text.length),
        ],
        [firstPart],
      );

      return {matches: matches.length, parts};
    };
  }, [input]);

  return (
    <div className="full-search" ref={setElement}>
      <header className="full-search__header">
        <span className="full-search__header__icon icon-search" />
        <div className="full-search__header__input">
          <input
            type="text"
            value={input}
            ref={inputRef}
            placeholder={t('fullsearchPlaceholder')}
            onChange={event => setInput(event.target.value)}
            data-uie-name="full-search-header-input"
          />
          {input && (
            <button
              className="button-icon icon-dismiss"
              onClick={() => setInput('')}
              data-uie-name="full-search-dismiss"
            />
          )}
        </div>
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

export default FullSearch;

registerReactComponent('full-search', {
  bindings: 'change, click, searchProvider',
  component: FullSearch,
});
