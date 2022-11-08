/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {KeyboardEvent, useEffect, useRef, useState} from 'react';

import type {WebappProperties} from '@wireapp/api-client/lib/user/data/';
import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';

import {isEnterKey, isKey, KEY} from 'Util/KeyboardUtil';
import {updateMentionRanges} from 'Util/MentionUtil';
import {getCursorPixelPosition} from 'Util/PopupUtil';
import {loadValue, storeValue} from 'Util/StorageUtil';
import {sortByPriority} from 'Util/StringUtil';

import emojiBindings from './emoji.json';
import {EmojiItem} from './EmojiItem';
import {inlineReplacements} from './inlineReplacements';

import {MentionEntity} from '../../message/MentionEntity';
import {useAppState} from '../../page/useAppState';
import {PropertiesRepository} from '../../properties/PropertiesRepository';
import {PROPERTIES_TYPE} from '../../properties/PropertiesType';
import {StorageKey} from '../../storage';

const escapeRegexp = (string: string): string => string.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

type InlineReplacement = {
  name: string;
  shortcut: string;
};

const inlineReplacement: InlineReplacement[] = inlineReplacements.sort((first, second) => {
  const isUnequalLength = first.shortcut.length !== second.shortcut.length;

  return isUnequalLength
    ? second.shortcut.length - first.shortcut.length
    : first.shortcut.localeCompare(second.shortcut);
});

const INLINE_MAX_LENGTH = Math.max(...inlineReplacement.map(({shortcut}) => shortcut.length));

const getEmojiPopupPosition = (input: HTMLTextAreaElement, container: HTMLDivElement) => {
  const position = getCursorPixelPosition(input);
  const top = position.top - container.offsetHeight - CONFIG.OFFSET_TOP;
  const left = position.left - CONFIG.OFFSET_LEFT;

  return {left, top};
};

const CONFIG = {
  LENGTH: 5,
  OFFSET_LEFT: 8,
  OFFSET_TOP: 8,
};

export interface EmojiData {
  aliases: string[];
  code: string;
  name: string;
}

type EmojiBinding = Record<string, EmojiData>;

export type EmojiListItem = {
  icon: string;
  name: string;
};

const useEmoji = (
  propertiesRepository: PropertiesRepository,
  updateText: (text: string) => void,
  onSend: (text: string) => void,
  currentMentions: MentionEntity[],
  setCurrentMentions: (mentions: MentionEntity[]) => void,
  textareaElement?: HTMLTextAreaElement | null,
) => {
  const emojiWrapperRef = useRef<HTMLDivElement>(null);
  const [emojiStartPosition, setEmojiStartPosition] = useState<number>(-1);
  const [selectedEmojiIndex, setSelectedEmojiIndex] = useState<number>(0);

  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [suppressKeyUp, setSuppressKeyUp] = useState<boolean>(false);
  const [shouldReplaceEmoji, setShouldReplaceEmoji] = useState<boolean>(
    propertiesRepository.getPreference(PROPERTIES_TYPE.EMOJI.REPLACE_INLINE),
  );
  const [emojiDictionary, setEmojiDictionary] = useState<Record<string, string>>({});
  const [emojiList, setEmojiList] = useState<EmojiListItem[]>();

  const [mappedEmojiList, setMappedEmojiList] = useState<EmojiListItem[]>([]);

  const {contentState} = useAppState();

  const emojiUsageCount: Record<string, number> = loadValue(StorageKey.CONVERSATION.EMOJI_USAGE_COUNT) || {};

  const closeEmojiPopup = () => {
    setIsVisible(false);
    window.removeEventListener('click', removeEmojiPopup);
  };

  const removeEmojiPopup = () => {
    closeEmojiPopup();
    setEmojiStartPosition(-1);
    setSelectedEmojiIndex(0);
    setMappedEmojiList([]);
  };

  const enterEmoji = (
    input: HTMLInputElement | HTMLTextAreaElement,
    emojiIcon: string,
    inlineEmojiStartPosition = emojiStartPosition,
  ) => {
    const {selectionStart: selection, selectionEnd: end, value: text} = input;

    if (selection && end) {
      const textBeforeEmoji = text.substring(0, inlineEmojiStartPosition - 1);
      const textAfterEmoji = text.slice(selection);
      const textWithEmoji = `${textBeforeEmoji}${emojiIcon}`;
      const updatedText = `${textWithEmoji}${textAfterEmoji}`;
      const newCursorPosition = textWithEmoji.length;

      updateText(updatedText);

      const difference = updatedText.length - text.length;
      const updatedMentions = updateMentionRanges(currentMentions, selection, end, difference);
      setCurrentMentions(updatedMentions);

      removeEmojiPopup();

      setTimeout(() => {
        if (textareaElement) {
          textareaElement.value = updatedText;
          textareaElement.setSelectionRange(newCursorPosition, newCursorPosition);
          textareaElement.focus();
        }
      }, 0);
    }
  };

  const tryReplaceInlineEmoji = (input: HTMLTextAreaElement): boolean => {
    const {selectionStart: selection, value: text} = input;

    if (shouldReplaceEmoji && text) {
      const textUntilCursor = text.substring(Math.max(0, selection - INLINE_MAX_LENGTH - 1), selection);

      for (const replacement of inlineReplacement) {
        const icon = emojiDictionary?.[replacement.name];

        if (icon) {
          const validInlineEmojiRegEx = new RegExp(`(^|\\s)${escapeRegexp(replacement.shortcut)}$`);

          if (validInlineEmojiRegEx.test(textUntilCursor)) {
            enterEmoji(input, icon, selection - replacement.shortcut.length + 1);

            return true;
          }
        }
      }
    }

    return false;
  };

  const rotateEmojiPopup = (backward: boolean) => {
    const emojiLength = mappedEmojiList.length;
    const nextOrPreviousIndex = (backward ? selectedEmojiIndex - 1 : selectedEmojiIndex + 1) % emojiLength;
    const newIndex = nextOrPreviousIndex === -1 ? emojiLength - 1 : nextOrPreviousIndex;

    setSelectedEmojiIndex(newIndex);
  };

  const getUsageCount = (emojiName: string): number => emojiUsageCount?.[emojiName] || 0;

  const increaseUsageCount = (emojiName: string): void => {
    emojiUsageCount[emojiName] = getUsageCount(emojiName) + 1;
    storeValue(StorageKey.CONVERSATION.EMOJI_USAGE_COUNT, emojiUsageCount);
  };

  const enterEmojiPopupLine = (input: HTMLInputElement | HTMLTextAreaElement, selectedEmoji: EmojiListItem): void => {
    const emojiIcon = selectedEmoji.icon;
    const emojiName = selectedEmoji.name.toLowerCase();

    enterEmoji(input, emojiIcon);
    increaseUsageCount(emojiName); // only emojis selected from the list should affect the count
  };

  const replaceAllInlineEmoji = (input: HTMLInputElement | HTMLTextAreaElement, shiftKeyPressed = false) => {
    const {selectionStart: selection, value: text} = input;

    if (selection) {
      let textBeforeCursor = text.slice(0, selection);
      let textAfterCursor = text.slice(selection);

      for (const replacement of inlineReplacement) {
        const icon = emojiDictionary[replacement.name];

        if (icon) {
          const validIInlineEmojiRegex = new RegExp(`(^|\\s)${escapeRegexp(replacement.shortcut)}(?=\\s|$)`, 'g');
          textBeforeCursor = textBeforeCursor.replace(validIInlineEmojiRegex, `$1${icon}`);
          textAfterCursor = textAfterCursor.replace(validIInlineEmojiRegex, `$1${icon}`);
        }
      }

      const updatedText = `${textBeforeCursor}${textAfterCursor}`;

      if (shiftKeyPressed) {
        updateText(updatedText);
      } else {
        onSend(updatedText);
      }
    }
  };

  const updateEmojiPopup = (input: HTMLTextAreaElement) => {
    const {selectionStart: selection, value: text} = input;

    if (!text) {
      return;
    }

    const query = text.slice(emojiStartPosition, selection);

    if (!query.length) {
      return closeEmojiPopup();
    }

    const shouldRemovePopup = !emojiList?.length || query.startsWith(' ') || /\s{2,}/.test(query);

    if (shouldRemovePopup) {
      return removeEmojiPopup();
    }

    const queryWords = query.split(' ');
    const expectedWords = (query.match(/\s/g) || []).length + 1;

    const filteredEmojiList: EmojiListItem[] = emojiList.filter(emoji => {
      const emojiNameWords = emoji.name.split(' ');

      if (emojiNameWords.length < expectedWords) {
        return false;
      }

      return queryWords.every(queryWord => {
        return emojiNameWords.some(emojiNameWord => emojiNameWord.startsWith(queryWord));
      });
    });

    const reduceEmojiList = filteredEmojiList.reduce<EmojiListItem[]>((accumulator, emoji) => {
      const iconNotFound = !accumulator.find(item => item.icon === emoji.icon);
      if (iconNotFound) {
        accumulator.push(emoji);
      }
      return accumulator;
    }, []);

    const sortedEmojiList = reduceEmojiList.sort((emojiA, emojiB) => {
      const usageCountA = getUsageCount(emojiA.name);
      const usageCountB = getUsageCount(emojiB.name);

      const sameUsageCount = usageCountA === usageCountB;
      return sameUsageCount ? sortByPriority(emojiA.name, emojiB.name, query) : usageCountB - usageCountA;
    });

    const emojiMatched = sortedEmojiList.slice(0, CONFIG.LENGTH);

    if (!emojiMatched.length) {
      return closeEmojiPopup();
    }

    setSelectedEmojiIndex(0);
    setMappedEmojiList(emojiMatched);
    setIsVisible(true);
  };

  const onInputKeyUp = (keyboardEvent: KeyboardEvent<HTMLTextAreaElement>) => {
    if (suppressKeyUp) {
      setSuppressKeyUp(false);

      return;
    }

    const input = keyboardEvent.currentTarget;
    const {selectionStart: selection, value: text} = input;

    if (text) {
      const popupTrigger = text.slice(Math.max(selection - 2, 0), selection);
      const containsPopupTrigger = /\B:$/.test(popupTrigger);

      if (containsPopupTrigger) {
        setEmojiStartPosition(selection);
        updateEmojiPopup(input);
      } else if (emojiStartPosition !== -1) {
        if (selection < emojiStartPosition || text[emojiStartPosition - 1] !== ':') {
          removeEmojiPopup();
        } else {
          updateEmojiPopup(input);
        }
      }
    }
  };

  const onInputKeyDown = (keyboardEvent: KeyboardEvent<HTMLTextAreaElement>): boolean => {
    const input = keyboardEvent.currentTarget;

    // Handling just entered inline emoji
    switch (keyboardEvent.key) {
      case KEY.SPACE: {
        if (tryReplaceInlineEmoji(input)) {
          return false;
        }
        break;
      }

      case KEY.TAB: {
        if (tryReplaceInlineEmoji(input)) {
          keyboardEvent.preventDefault();
          return true;
        }
        break;
      }

      default:
        break;
    }

    // Handling emoji popup
    if (isVisible) {
      switch (keyboardEvent.key) {
        case KEY.ESC: {
          keyboardEvent.preventDefault();
          removeEmojiPopup();
          return true;
        }

        case KEY.ARROW_UP:
        case KEY.ARROW_DOWN: {
          keyboardEvent.preventDefault();
          rotateEmojiPopup(isKey(keyboardEvent, KEY.ARROW_UP));
          setSuppressKeyUp(true);
          return true;
        }

        case KEY.ENTER:
        case KEY.TAB: {
          if (keyboardEvent.shiftKey && isEnterKey(keyboardEvent)) {
            break;
          }

          keyboardEvent.preventDefault();

          const emoji = mappedEmojiList.find((emoji, index) => index === selectedEmojiIndex);

          if (emoji) {
            enterEmojiPopupLine(input, emoji);
          }

          return true;
        }

        default:
          break;
      }
    }

    if (!shouldReplaceEmoji) {
      return false;
    }

    if (isEnterKey(keyboardEvent)) {
      if (keyboardEvent.shiftKey) {
        replaceAllInlineEmoji(input, keyboardEvent.shiftKey);

        return false;
      }

      keyboardEvent.preventDefault();
      replaceAllInlineEmoji(input);

      return true;
    }

    return false;
  };

  const renderEmojiComponent = () =>
    isVisible ? (
      <div className="conversation-input-bar-emoji-list" ref={emojiWrapperRef}>
        {mappedEmojiList.map((emoji, index) => {
          return (
            <EmojiItem
              key={emoji.name}
              selectedEmoji={selectedEmojiIndex === index}
              emoji={emoji}
              onMouseEnter={() => setSelectedEmojiIndex(index)}
              onClick={() => {
                if (textareaElement) {
                  enterEmojiPopupLine(textareaElement, emoji);
                }
              }}
            />
          );
        })}
      </div>
    ) : null;

  useEffect(() => {
    if (isVisible) {
      window.addEventListener('click', removeEmojiPopup);
    }

    return () => {
      if (isVisible) {
        window.removeEventListener('click', removeEmojiPopup);
      }
    };
  }, [isVisible]);

  const getInitialsEmojis = () => {
    const newEmojiList: EmojiListItem[] = [];
    const newEmojiDict: Record<string, string> = {};

    for (const code in emojiBindings) {
      const details = (emojiBindings as EmojiBinding)[code];

      // Ignore 'tone' emojis for now, they clutter suggestions too much.
      if (details.name.match(/_tone\d/)) {
        continue;
      }

      const alphaCodes = [details.name, ...details.aliases];
      const splitDetailsCode = details.code.split('-').map(char => Number(`0x${char}`));
      const icon: string = String.fromCodePoint(...splitDetailsCode);

      alphaCodes.forEach(alphaCode => {
        const name = alphaCode.slice(1, -1).replace(/_/g, ' ').toLowerCase();

        newEmojiList.push({icon, name});
        newEmojiDict[name] = icon;
      });
    }

    setEmojiList(newEmojiList);
    setEmojiDictionary(newEmojiDict);
  };

  useEffect(() => {
    getInitialsEmojis();
  }, []);

  useEffect(() => {
    removeEmojiPopup();
  }, [contentState]);

  useEffect(() => {
    if (textareaElement && emojiWrapperRef.current && mappedEmojiList.length) {
      const {top, left} = getEmojiPopupPosition(textareaElement, emojiWrapperRef.current);

      emojiWrapperRef.current.style.left = `${left}px`;
      emojiWrapperRef.current.style.top = `${top}px`;
    }
  }, [mappedEmojiList, textareaElement]);

  useEffect(() => {
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATE.EMOJI.REPLACE_INLINE, setShouldReplaceEmoji);
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATED, (properties: WebappProperties) => {
      setShouldReplaceEmoji(properties.settings.emoji.replace_inline);
    });
  }, []);

  return {onInputKeyDown, onInputKeyUp, renderEmojiComponent};
};

export {useEmoji};
