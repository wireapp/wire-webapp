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

import {MutableRefObject, useCallback, useMemo, useState} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  MenuOption,
  MenuRenderFn,
  MenuTextMatch,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
// The emoji list comes from the emoji-picker-react package that we also use for reactions. It's a little hacky how we import it but since it's typechecked, we will be warned if this file doesn't exist in the repo with further updates
import emojiList from 'emoji-picker-react/src/data/emojis.json';
import {$createTextNode, $getSelection, $isRangeSelection, TextNode} from 'lexical';
import * as ReactDOM from 'react-dom';

import {TypeaheadMenuPlugin} from 'Components/RichTextEditor/plugins/TypeaheadMenuPlugin';
import {loadValue, storeValue} from 'Util/StorageUtil';
import {sortByPriority} from 'Util/StringUtil';

import {EmojiItem} from './EmojiItem';

import {StorageKey} from '../../../../storage';
import {getDOMRangeRect} from '../../utils/getDomRangeRect';
import {getSelectionInfo} from '../../utils/getSelectionInfo';

const TRIGGER = ':';

/**
 * Will detect emoji triggers in a text
 * @param text the text in which to look for emoji triggers
 */
function checkForEmojis(text: string): MenuTextMatch | null {
  const match = new RegExp(`(^| )(${TRIGGER}([\\w +\\-][\\w \\-]*))$`).exec(text);

  if (match === null) {
    return null;
  }
  const search = match[2];
  const term = match[3];

  if (term.length === 0) {
    return null;
  }

  return {
    leadOffset: match.index,
    matchingString: term,
    replaceableString: search,
  };
}

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
    super(title + options.keywords?.join('_'));
    this.title = title.replace(/_/g, ' ');
    this.emoji = emoji;
    this.keywords = options.keywords || [];
  }
}

const emojiUsageCount: Record<string, number> = loadValue(StorageKey.CONVERSATION.EMOJI_USAGE_COUNT) || {};

const getUsageCount = (emojiName: string): number => emojiUsageCount[emojiName] || 0;

const MAX_EMOJI_SUGGESTION_COUNT = 5;

type Props = {
  openStateRef: MutableRefObject<boolean>;
};

const emojies: {n: string[]; u: string}[] = Object.values(emojiList).flat();

const emojiOptions = emojies.map(({n: aliases, u: codepoint}) => {
  const codepoints = codepoint.split('-').map(code => parseInt(code, 16));
  return new EmojiOption(aliases[0], String.fromCodePoint(...codepoints), {
    keywords: aliases,
  });
});

export function EmojiPickerPlugin({openStateRef}: Props) {
  const [lexicalEditor] = useLexicalComposerContext();

  const [queryString, setQueryString] = useState<string | null>(null);

  const increaseUsageCount = (emojiName: string | null): void => {
    if (emojiName) {
      emojiUsageCount[emojiName] = getUsageCount(emojiName) + 1;
      storeValue(StorageKey.CONVERSATION.EMOJI_USAGE_COUNT, emojiUsageCount);
    }
  };

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

  const options: Array<EmojiOption> = useMemo(() => {
    const filteredEmojis = emojiOptions.filter((emoji: EmojiOption) => {
      if (queryString === null) {
        return false;
      }

      return emoji.keywords.some(emojiNameWord => emojiNameWord.includes(queryString));
    });

    return filteredEmojis
      .sort((emojiA, emojiB) => {
        const usageCountA = getUsageCount(emojiA.title);
        const usageCountB = getUsageCount(emojiB.title);

        const sameUsageCount = usageCountA === usageCountB;
        return sameUsageCount
          ? sortByPriority(emojiA.title, emojiB.title, queryString || '')
          : usageCountB - usageCountA;
      })
      .slice(0, MAX_EMOJI_SUGGESTION_COUNT);
  }, [queryString]);

  const onSelectOption = (selectedOption: EmojiOption, nodeToRemove: TextNode | null, closeMenu: () => void) => {
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
  };

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

  const menuRender: MenuRenderFn<EmojiOption> = (
    anchorElementRef,
    {selectedIndex, selectOptionAndCleanUp, setHighlightedIndex},
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

  openStateRef.current = options.length > 0;

  return (
    <TypeaheadMenuPlugin
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      triggerFn={checkForEmojiPickerMatch}
      options={options}
      menuRenderFn={menuRender}
      containerId="emoji-typeahead-menu"
    />
  );
}
