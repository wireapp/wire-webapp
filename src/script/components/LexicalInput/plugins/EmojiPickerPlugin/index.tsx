/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {useCallback, useEffect, useMemo, useState} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import {$createTextNode, $getSelection, $isRangeSelection, TextNode} from 'lexical';
import * as ReactDOM from 'react-dom';

import {loadValue, storeValue} from 'Util/StorageUtil';
import {sortByPriority} from 'Util/StringUtil';

import {StorageKey} from '../../../../storage';
import {EmojiItem} from '../../components/EmojiItem';
import {getDOMRangeRect} from '../../utils/getDomRangeRect';

export class EmojiOption extends MenuOption {
  title: string;
  emoji: string;
  keywords: Array<string>;

  constructor(
    title: string,
    emoji: string,
    options: {
      keywords?: Array<string>;
    },
  ) {
    super(title);
    this.title = title;
    this.emoji = emoji;
    this.keywords = options.keywords || [];
  }
}

type Emoji = {
  emoji: string;
  description: string;
  category: string;
  aliases: Array<string>;
  tags: Array<string>;
  unicode_version: string;
  ios_version: string;
  skin_tones?: boolean;
};

const MAX_EMOJI_SUGGESTION_COUNT = 5;

export const EmojiPickerPlugin = () => {
  const [lexicalEditor] = useLexicalComposerContext();

  const [queryString, setQueryString] = useState<string | null>(null);
  const [emojis, setEmojis] = useState<Array<Emoji>>([]);

  const emojiUsageCount: Record<string, number> = loadValue(StorageKey.CONVERSATION.EMOJI_USAGE_COUNT) || {};

  const getUsageCount = (emojiName: string): number => emojiUsageCount?.[emojiName] || 0;

  const increaseUsageCount = (emojiName: string | null): void => {
    if (emojiName) {
      emojiUsageCount[emojiName] = getUsageCount(emojiName) + 1;
      storeValue(StorageKey.CONVERSATION.EMOJI_USAGE_COUNT, emojiUsageCount);
    }
  };

  useEffect(() => {
    // @ts-ignore
    import('../../utils/emoji-list.ts').then(file => setEmojis(file.default));
  }, []);

  const emojiOptions = useMemo(
    () =>
      emojis != null
        ? emojis.map(
            ({emoji, aliases, tags}) =>
              new EmojiOption(aliases[0], emoji, {
                keywords: [...aliases, ...tags],
              }),
          )
        : [],
    [emojis],
  );

  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch(':', {
    minLength: 0,
  });

  const options: Array<EmojiOption> = useMemo(() => {
    return emojiOptions
      .filter((option: EmojiOption) => {
        return queryString != null
          ? new RegExp(queryString, 'gi').exec(option.title) || option.keywords != null
            ? option.keywords.some((keyword: string) => new RegExp(queryString, 'gi').exec(keyword))
            : false
          : emojiOptions;
      })
      .slice(0, MAX_EMOJI_SUGGESTION_COUNT)
      .sort((emojiA, emojiB) => {
        const usageCountA = getUsageCount(emojiA.title);
        const usageCountB = getUsageCount(emojiB.title);

        const sameUsageCount = usageCountA === usageCountB;
        return sameUsageCount
          ? sortByPriority(emojiA.title, emojiB.title, queryString || '')
          : usageCountB - usageCountA;
      });
  }, [emojiOptions, queryString]);

  const onSelectOption = useCallback(
    (selectedOption: EmojiOption, nodeToRemove: TextNode | null, closeMenu: () => void) => {
      lexicalEditor.update(() => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection) || selectedOption == null) {
          return;
        }

        if (nodeToRemove) {
          nodeToRemove.remove();
        }

        selection.insertNodes([$createTextNode(selectedOption.emoji)]);
        increaseUsageCount(selectedOption.title);

        closeMenu();
      });
    },
    [lexicalEditor],
  );

  const rootElement = lexicalEditor.getRootElement();

  return (
    <LexicalTypeaheadMenuPlugin
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      triggerFn={checkForTriggerMatch}
      options={options}
      menuRenderFn={(anchorElementRef, {selectedIndex, selectOptionAndCleanUp, setHighlightedIndex}) => {
        if (!anchorElementRef.current || !options.length) {
          return null;
        }

        const getPosition = () => {
          const nativeSelection = window.getSelection();

          if (!rootElement || !nativeSelection) {
            return {bottom: 0, left: 0};
          }

          const rangeRect = getDOMRangeRect(nativeSelection, rootElement);

          return {
            bottom: window.innerHeight - rangeRect.top,
            left: rangeRect.x,
          };
        };

        const {bottom, left} = getPosition();

        return ReactDOM.createPortal(
          <div className="typeahead-popover emoji-menu">
            <div className="conversation-input-bar-emoji-list" style={{bottom, left}}>
              {options.map((option: EmojiOption, index) => (
                <EmojiItem
                  ref={option.setRefElement}
                  key={option.key}
                  selectedEmoji={selectedIndex === index}
                  emoji={option}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => {
                    setHighlightedIndex(index);
                    selectOptionAndCleanUp(option);
                  }}
                />
              ))}
            </div>
          </div>,
          anchorElementRef.current,
        );
      }}
    />
  );
};
