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

import {useCallback, useMemo, useState, MutableRefObject} from 'react';

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

import {ItemProps} from './LexicalTypeheadMenuPlugin';

import {StorageKey} from '../../../storage';
import {EmojiItem} from '../components/EmojiItem';
import emojiList from '../utils/emojiList';
import {checkForEmojis} from '../utils/emojiUtils';
import {getDOMRangeRect} from '../utils/getDomRangeRect';
import {getSelectionInfo} from '../utils/getSelectionInfo';

export class EmojiOption extends MenuOption {
  title: string;
  emoji: string;
  keywords: string[];

  constructor(
    title: string,
    emoji: string,
    options: {
      keywords?: string[];
    },
  ) {
    super(title);
    this.title = title.replace(/_/g, ' ');
    this.emoji = emoji;
    this.keywords = options.keywords || [];
  }
}

const MAX_EMOJI_SUGGESTION_COUNT = 5;

export function EmojiPickerPlugin() {
  const [lexicalEditor] = useLexicalComposerContext();

  const [queryString, setQueryString] = useState<string | null>(null);

  const emojiUsageCount: Record<string, number> = loadValue(StorageKey.CONVERSATION.EMOJI_USAGE_COUNT) || {};

  const getUsageCount = (emojiName: string): number => emojiUsageCount?.[emojiName] || 0;

  const increaseUsageCount = (emojiName: string | null): void => {
    if (emojiName) {
      emojiUsageCount[emojiName] = getUsageCount(emojiName) + 1;
      storeValue(StorageKey.CONVERSATION.EMOJI_USAGE_COUNT, emojiUsageCount);
    }
  };

  const emojiOptions = useMemo(
    () =>
      emojiList.map(
        ({emoji, aliases, tags}) =>
          new EmojiOption(aliases[0], emoji, {
            keywords: [...aliases, ...tags],
          }),
      ),
    [],
  );

  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch('/', {
    minLength: 0,
  });

  const checkForEmojiPickerMatch = useCallback(
    (text: string) => {
      // Don't show the menu if the next character is a word character
      const info = getSelectionInfo([':']);

      if (info?.isTextNode && info.wordCharAfterCursor) {
        return null;
      }

      const slashMatch = checkForTriggerMatch(text, lexicalEditor);

      if (slashMatch !== null) {
        return null;
      }

      const queryMatch = checkForEmojis(text);

      return queryMatch?.replaceableString ? queryMatch : null;
    },
    [checkForTriggerMatch, lexicalEditor],
  );

  const options: EmojiOption[] = useMemo(() => {
    const filteredEmojis = emojiOptions.filter((emoji: EmojiOption) => {
      if (queryString == null) {
        return false;
      }

      const expectedWords = (queryString.match(/\s/g) || []).length + 1;
      const emojiNameWords = emoji.title.split(' ');

      if (emojiNameWords.length < expectedWords) {
        return false;
      }

      const queryWords = queryString.split(' ');

      return queryWords.every(queryWord => {
        return emojiNameWords.some(emojiNameWord => emojiNameWord.startsWith(queryWord));
      });
    });

    const sortedEmojiList = filteredEmojis.sort((emojiA, emojiB) => {
      const usageCountA = getUsageCount(emojiA.title);
      const usageCountB = getUsageCount(emojiB.title);

      const sameUsageCount = usageCountA === usageCountB;

      return sameUsageCount ? sortByPriority(emojiA.title, emojiB.title, queryString || '') : usageCountB - usageCountA;
    });

    return sortedEmojiList.slice(0, MAX_EMOJI_SUGGESTION_COUNT);
  }, [emojiOptions, getUsageCount, queryString]);

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
    [increaseUsageCount, lexicalEditor],
  );

  const rootElement = lexicalEditor.getRootElement();

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

  const menuRender = (
    anchorElementRef: MutableRefObject<HTMLElement | null>,
    {selectedIndex, selectOptionAndCleanUp, setHighlightedIndex}: ItemProps<EmojiOption>,
  ) => {
    if (!anchorElementRef.current || !options.length) {
      return null;
    }

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
  };

  return (
    <LexicalTypeaheadMenuPlugin
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      triggerFn={checkForEmojiPickerMatch}
      options={options}
      menuRenderFn={menuRender}
    />
  );
}
