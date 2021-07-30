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

import React, {useEffect, useMemo, useState} from 'react';
import {escape} from 'underscore';

import Avatar, {AVATAR_SIZE} from 'Components/Avatar';
import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {noop} from 'Util/util';
import {isScrolledBottom} from 'Util/scroll-helpers';
import useEffectRef from 'Util/useEffectRef';
import {formatDateShort} from 'Util/TimeUtil';

import type {Text} from '../../entity/message/Text';
import type {Message} from '../../entity/message/Message';
import useDebounce from '../../hooks/useDebounce';
import {getSearchRegex} from '../../search/FullTextSearch';
import {ContentMessage} from '../../entity/message/ContentMessage';

export interface FullSearchProps {
  change?: (query: string) => void;
  click?: (messageEntity: Message) => void;
  searchProvider: (query: string) => Promise<{messageEntities: Message[]; query: string}>;
}

interface FullSearchItemProps {
  formatText: (text: string) => {formatedText: string; matches: number};
  message: ContentMessage;
  onClick: () => void;
}

const FullSearchItem: React.FC<FullSearchItemProps> = ({message, onClick, formatText}) => {
  const {user, timestamp} = useKoSubscribableChildren(message, ['user', 'timestamp']);
  const {name} = useKoSubscribableChildren(user, ['name']);
  const {formatedText, matches} = formatText(escape((message.getFirstAsset() as Text).text));
  return (
    <div className="full-search__item" onClick={onClick} data-uie-name="full-search-item">
      <div className="full-search__item__avatar">
        <Avatar participant={user} avatarSize={AVATAR_SIZE.X_SMALL} />
      </div>
      <div className="full-search__item__content">
        <div
          className="full-search__item__content__text ellipsis"
          data-uie-name="full-search-item-text"
          dangerouslySetInnerHTML={{__html: formatedText}}
        ></div>
        <div className="full-search__item__content__info">
          <span className="font-weight-bold" data-uie-name="full-search-item-sender">
            {name}
          </span>
          <span data-uie-name="full-search-item-timestamp">{formatDateShort(timestamp)}</span>
        </div>
      </div>
      {matches > 1 && (
        <div className="badge" data-uie-name="full-search-item-badge">
          {matches.toString(10)}
        </div>
      )}
    </div>
  );
};

const FullSearch: React.FC<FullSearchProps> = ({searchProvider, click = noop, change = noop}) => {
  const MAX_VISIBLE_MESSAGES = 30;
  const PRE_MARKED_OFFSET = 20;
  const MAX_TEXT_LENGTH = 60;
  const MAX_OFFSET_INDEX = 30;

  const [input, setInput] = useState('');
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
  }, [element]);

  const formatSearchResult = useMemo(() => {
    const replaceRegex = getSearchRegex(escape(input));

    return (text: string) => {
      let matches = 0;
      text = escape(text);
      let formatedText = text.replace(replaceRegex, (match: string): string => {
        matches += 1;
        return `<mark class='full-search__marked' data-uie-name='full-search-item-mark'>${match}</mark>`;
      });

      const markOffset = formatedText.indexOf('<mark') - 1;
      let sliceOffset = markOffset;

      for (const index of [...Array(Math.max(markOffset, 0)).keys()].reverse()) {
        if (index < markOffset - PRE_MARKED_OFFSET) {
          break;
        }

        const char = formatedText[index];
        if (char === ' ') {
          sliceOffset = index + 1;
        }
      }

      const textTooLong = text.length > MAX_TEXT_LENGTH;
      const offsetTooBig = markOffset > MAX_OFFSET_INDEX;
      if (textTooLong && offsetTooBig) {
        formatedText = `…${formatedText.slice(sliceOffset)}`;
      }

      return {formatedText, matches};
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
            placeholder={t('fullsearchPlaceholder')}
            autoFocus
            onChange={event => setInput(event.target.value)}
            data-uie-name="full-search-header-input"
          />
          {input && (
            <span
              className="button-icon icon-dismiss"
              onClick={() => setInput('')}
              data-uie-name="full-search-dismiss"
            />
          )}
        </div>
      </header>
      {hasNoResults && (
        <div className="full-search__no-result" data-uie-name="full-search-no-results">
          {t('fullsearchNoResults')}
        </div>
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
