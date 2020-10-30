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

import {WebAppEvents} from '@wireapp/webapp-events';
import type {WebappProperties} from '@wireapp/api-client/src/user/data';
import {amplify} from 'amplify';
import ko from 'knockout';
import {loadValue, storeValue} from 'Util/StorageUtil';
import {getCursorPixelPosition} from 'Util/PopupUtil';
import {KEY, isKey, isEnterKey} from 'Util/KeyboardUtil';
import {sortByPriority} from 'Util/StringUtil';

import emojiBindings from './emoji.json';
import {PROPERTIES_TYPE} from '../../properties/PropertiesType';
import {StorageKey} from '../../storage/StorageKey';
import {PropertiesRepository} from 'src/script/properties/PropertiesRepository';

export interface EmojiData {
  aliases: string[];
  code: string;
  name: string;
}

type EmojiBinding = Record<string, EmojiData>;

export class EmojiInputViewModel {
  private isVisible: boolean;
  private readonly emojiList: {icon: string; name: string}[];
  private emojiDict: Record<string, string> = {};
  private readonly emojiDiv: JQuery<HTMLElement>;
  private emojiStartPosition: number;
  private emojiUsageCount: Record<string, number> = {};
  private shouldReplaceEmoji: boolean;
  private suppressKeyUp: boolean;

  static get CONFIG() {
    return {
      LIST: {
        LENGTH: 5,
        OFFSET_LEFT: 8,
        OFFSET_TOP: 8,
      },
    };
  }

  // DO NOT USE COLON WITH LOWERCASE LETTERS IN THE SHORTCUTS, or you will prevent searching emojis.
  // For example, while :D should be replaced with unicode symbol, :d should allow searching for :dancer:
  /* eslint-disable sort-keys-fix/sort-keys-fix */
  static get INLINE_REPLACEMENT(): {name: string; shortcut: string}[] {
    return [
      {shortcut: ':)', name: 'slight smile'},
      {shortcut: ':-)', name: 'slight smile'},
      {shortcut: ':D', name: 'smile'},
      {shortcut: ':-D', name: 'smile'},
      {shortcut: ':-d', name: 'grinning'},
      {shortcut: 'B-)', name: 'sunglasses'},
      {shortcut: 'b-)', name: 'sunglasses'},
      {shortcut: '8-)', name: 'sunglasses'},
      {shortcut: ':(', name: 'disappointed'},
      {shortcut: ':-(', name: 'disappointed'},
      {shortcut: ';)', name: 'wink'},
      {shortcut: ';-)', name: 'wink'},
      {shortcut: ';-]', name: 'wink'},
      {shortcut: ';]', name: 'wink'},
      {shortcut: ':/', name: 'confused'},
      {shortcut: ':-/', name: 'confused'},
      {shortcut: ':P', name: 'stuck out tongue'},
      {shortcut: ':-P', name: 'stuck out tongue'},
      {shortcut: ':-p', name: 'stuck out tongue'},
      {shortcut: ';P', name: 'stuck out tongue winking eye'},
      {shortcut: ';-P', name: 'stuck out tongue winking eye'},
      {shortcut: ';-p', name: 'stuck out tongue winking eye'},
      {shortcut: ':O', name: 'open mouth'},
      {shortcut: ':-o', name: 'open mouth'},
      {shortcut: 'O:)', name: 'innocent'},
      {shortcut: 'O:-)', name: 'innocent'},
      {shortcut: 'o:)', name: 'innocent'},
      {shortcut: 'o:-)', name: 'innocent'},
      {shortcut: ';^)', name: 'smirk'},
      {shortcut: ':@', name: 'angry'},
      {shortcut: '>:(', name: 'rage'},
      {shortcut: '}:-)', name: 'smiling imp'},
      {shortcut: '}:)', name: 'smiling imp'},
      {shortcut: '3:-)', name: 'smiling imp'},
      {shortcut: '3:)', name: 'smiling imp'},
      {shortcut: ":'-(", name: 'cry'},
      {shortcut: ":'(", name: 'cry'},
      {shortcut: ';(', name: 'cry'},
      {shortcut: ":'-)", name: 'joy'},
      {shortcut: ":')", name: 'joy'},
      {shortcut: ':*', name: 'kissing heart'},
      {shortcut: ':^*', name: 'kissing heart'},
      {shortcut: ':-*', name: 'kissing heart'},
      {shortcut: ':-|', name: 'neutral face'},
      {shortcut: ':|', name: 'neutral face'},
      {shortcut: ':$', name: 'flushed'},
      {shortcut: ':-X', name: 'no mouth'},
      {shortcut: ':X', name: 'no mouth'},
      {shortcut: ':-#', name: 'no mouth'},
      {shortcut: ':#', name: 'no mouth'},
      {shortcut: '\\o/', name: 'raised hands'},
      {shortcut: '<3', name: 'heart'},
      {shortcut: '</3', name: 'broken heart'},
    ].sort((first, second) => {
      const isUnequalLength = first.shortcut.length !== second.shortcut.length;

      return isUnequalLength
        ? second.shortcut.length - first.shortcut.length
        : first.shortcut.localeCompare(second.shortcut);
    });
  }
  /* eslint-enable sort-keys-fix/sort-keys-fix */

  static INLINE_MAX_LENGTH = Math.max(...EmojiInputViewModel.INLINE_REPLACEMENT.map(({shortcut}) => shortcut.length));

  constructor(propertiesRepository: PropertiesRepository) {
    const EMOJI_DIV_CLASS = 'conversation-input-bar-emoji-list';
    this.isVisible = false;

    this.emojiList = [];
    this.emojiDict = {};

    this.emojiDiv = $(`<div class='${EMOJI_DIV_CLASS}' />`);
    this.emojiStartPosition = -1;
    this.emojiUsageCount = loadValue(StorageKey.CONVERSATION.EMOJI_USAGE_COUNT) || {};

    this.shouldReplaceEmoji = propertiesRepository.getPreference(PROPERTIES_TYPE.EMOJI.REPLACE_INLINE);

    $(document).on('click', `.${EMOJI_DIV_CLASS}`, event => {
      const clicked = $(event.target);
      const emojiLine = clicked.hasClass('emoji') ? clicked : clicked.closest('.emoji');
      const [input] = $<HTMLInputElement>('#conversation-input-bar-text');
      this.enterEmojiPopupLine(input, emojiLine);
      return false;
    });

    $(document).on('mouseenter', `.${EMOJI_DIV_CLASS} .emoji`, event => {
      $(`.${EMOJI_DIV_CLASS} .emoji`).removeClass('selected');
      $(event.currentTarget).addClass('selected');
    });

    for (const code in emojiBindings) {
      const details = (emojiBindings as EmojiBinding)[code];

      // Ignore 'tone' emojis for now, they clutter suggestions too much.
      if (details.name.match(/_tone\d/)) {
        continue;
      }

      const icon: string = String.fromCodePoint.apply(
        null,
        details.code.split('-').map(char => `0x${char}`),
      );
      const alphaCodes = [details.name, ...details.aliases];
      alphaCodes.forEach(alphaCode => {
        if (alphaCode) {
          const name = alphaCode.slice(1, -1).replace(/_/g, ' ').toLowerCase();
          this.emojiList.push({icon, name});
          this.emojiDict[name] = icon;
        }
      });
    }

    this.initSubscriptions();
  }

  onInputKeyDown = (data: unknown, keyboardEvent: KeyboardEvent): boolean => {
    const input = keyboardEvent.target as HTMLInputElement;

    // Handling just entered inline emoji
    switch (keyboardEvent.key) {
      case KEY.SPACE: {
        if (this.tryReplaceInlineEmoji(input)) {
          return false;
        }
        break;
      }

      case KEY.TAB: {
        if (this.tryReplaceInlineEmoji(input)) {
          keyboardEvent.preventDefault();
          return true;
        }
        break;
      }

      default:
        break;
    }

    // Handling emoji popup
    if (this.isVisible) {
      switch (keyboardEvent.key) {
        case KEY.ESC: {
          this.removeEmojiPopup();
          keyboardEvent.preventDefault();
          return true;
        }

        case KEY.ARROW_UP:
        case KEY.ARROW_DOWN: {
          this.rotateEmojiPopup(isKey(keyboardEvent, KEY.ARROW_UP));
          this.suppressKeyUp = true;
          keyboardEvent.preventDefault();
          return true;
        }

        case KEY.ENTER:
        case KEY.TAB: {
          if (keyboardEvent.shiftKey && isEnterKey(keyboardEvent)) {
            break;
          }

          this.enterEmojiPopupLine(input, this.emojiDiv.find('.emoji.selected'));
          keyboardEvent.preventDefault();
          return true;
        }

        default:
          break;
      }
    }

    // Handling inline emoji in the whole text
    if (isEnterKey(keyboardEvent)) {
      this.replaceAllInlineEmoji(input);
    }

    return false;
  };

  onInputKeyUp = (data: unknown, keyboardEvent: KeyboardEvent): boolean => {
    if (this.suppressKeyUp) {
      this.suppressKeyUp = false;
      return true;
    }

    const input = keyboardEvent.target as HTMLTextAreaElement;
    const {selectionStart: selection, value: text} = input;

    if (text) {
      const popupTrigger = text.slice(Math.max(selection - 2, 0), selection);
      const containsPopupTrigger = /\B:$/.test(popupTrigger);
      if (containsPopupTrigger) {
        this.emojiStartPosition = selection;
        this.updateEmojiPopup(input);
      } else if (this.emojiStartPosition !== -1) {
        if (selection < this.emojiStartPosition || text[this.emojiStartPosition - 1] !== ':') {
          this.removeEmojiPopup();
        } else {
          this.updateEmojiPopup(input);
        }
      }
    }

    return true;
  };

  private readonly initSubscriptions = (): void => {
    amplify.subscribe(WebAppEvents.CONTENT.SWITCH, this.removeEmojiPopup);
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATE.EMOJI.REPLACE_INLINE, this.updatedReplaceEmojiPreference);
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATED, (properties: WebappProperties) => {
      this.updatedReplaceEmojiPreference(properties.settings.emoji.replace_inline);
    });
  };

  updatedReplaceEmojiPreference = (preference: boolean): void => {
    this.shouldReplaceEmoji = preference;
  };

  private readonly tryReplaceInlineEmoji = (input: HTMLInputElement): boolean => {
    const {selectionStart: selection, value: text} = input;

    if (this.shouldReplaceEmoji && text) {
      const textUntilCursor = text.substring(
        Math.max(0, selection - EmojiInputViewModel.INLINE_MAX_LENGTH - 1),
        selection,
      );

      for (const replacement of EmojiInputViewModel.INLINE_REPLACEMENT) {
        const icon = this.emojiDict[replacement.name];
        if (icon) {
          const validInlineEmojiRegEx = new RegExp(`(^|\\s)${this.escapeRegexp(replacement.shortcut)}$`);

          if (validInlineEmojiRegEx.test(textUntilCursor)) {
            this.emojiStartPosition = selection - replacement.shortcut.length + 1;
            this.enterEmoji(input, icon);

            return true;
          }
        }
      }
    }

    return false;
  };

  private readonly replaceAllInlineEmoji = (input: HTMLInputElement): void | boolean => {
    if (!this.shouldReplaceEmoji) {
      return false;
    }

    const {selectionStart: selection, value: text} = input;
    let textBeforeCursor = text.substr(0, selection);
    let textAfterCursor = text.substr(selection);

    for (const replacement of EmojiInputViewModel.INLINE_REPLACEMENT) {
      const icon = this.emojiDict[replacement.name];

      if (icon) {
        const validIInlineEmojiRegex = new RegExp(`(^|\\s)${this.escapeRegexp(replacement.shortcut)}(?=\\s|$)`, 'g');
        textBeforeCursor = textBeforeCursor.replace(validIInlineEmojiRegex, `$1${icon}`);
        textAfterCursor = textAfterCursor.replace(validIInlineEmojiRegex, `$1${icon}`);
      }
    }

    input.value = `${textBeforeCursor}${textAfterCursor}`;
    input.setSelectionRange(textBeforeCursor.length, textBeforeCursor.length);
    ko.utils.triggerEvent(input, 'change');
    $(input).focus();
  };

  private readonly updateEmojiPopup = (input: HTMLTextAreaElement): void => {
    const {selectionStart: selection, value: text} = input;
    if (!text) {
      return;
    }

    const query = text.substr(this.emojiStartPosition, selection - this.emojiStartPosition);
    if (!query.length) {
      return this.closeEmojiPopup();
    }

    const shouldRemovePopup = !this.emojiList.length || query.startsWith(' ') || /\s{2,}/.test(query);
    if (shouldRemovePopup) {
      return this.removeEmojiPopup();
    }

    const queryWords = query.split(' ');
    const expectedWords = (query.match(/\s/g) || []).length + 1;

    const emojiMatched = this.emojiList
      .filter(emoji => {
        const emojiNameWords = emoji.name.split(' ');

        if (emojiNameWords.length < expectedWords) {
          return false;
        }

        return queryWords.every(queryWord => {
          return emojiNameWords.some(emojiNameWord => emojiNameWord.startsWith(queryWord));
        });
      })
      .reduce((accumulator, emoji) => {
        const iconNotFound = !accumulator.find(item => item.icon === emoji.icon);
        if (iconNotFound) {
          accumulator.push(emoji);
        }
        return accumulator;
      }, [])
      .sort((emojiA, emojiB) => {
        const usageCountA = this.getUsageCount(emojiA.name);
        const usageCountB = this.getUsageCount(emojiB.name);

        const sameUsageCount = usageCountA === usageCountB;
        return sameUsageCount ? sortByPriority(emojiA.name, emojiB.name, query) : usageCountB - usageCountA;
      })
      .slice(0, EmojiInputViewModel.CONFIG.LIST.LENGTH)
      .map(emoji => {
        return `
          <div class='emoji'>
            <span class='symbol'>${emoji.icon}</span><span class='name'>${emoji.name}</span>
          </div>`;
      })
      .join('');

    if (emojiMatched === '') {
      return this.closeEmojiPopup();
    }

    window.addEventListener('click', this.removeEmojiPopup);
    this.isVisible = true;
    this.emojiDiv.html(emojiMatched).appendTo('body').show();
    this.emojiDiv.find('.emoji:nth(0)').addClass('selected');

    const position = getCursorPixelPosition(input);
    const top = position.top - this.emojiDiv.height() - EmojiInputViewModel.CONFIG.LIST.OFFSET_TOP;
    const left = position.left - EmojiInputViewModel.CONFIG.LIST.OFFSET_LEFT;

    this.emojiDiv.css('left', left);
    this.emojiDiv.css('top', top);
  };

  private readonly rotateEmojiPopup = (backward: boolean): void => {
    const previous = this.emojiDiv.find('.emoji.selected');
    const newSelection = (previous.index() + (backward ? -1 : 1)) % this.emojiDiv.find('.emoji').length;
    previous.removeClass('selected');
    this.emojiDiv.find(`.emoji:nth(${newSelection})`).addClass('selected');
  };

  private readonly enterEmojiPopupLine = (
    input: HTMLInputElement,
    emojiLine: JQuery<HTMLElement> | JQuery<Document>,
  ): void => {
    const emojiIcon = emojiLine.find('.symbol').text();
    const emojiName = emojiLine.find('.name').text().toLowerCase();

    this.enterEmoji(input, emojiIcon);
    this.increaseUsageCount(emojiName); // only emojis selected from the list should affect the count
  };

  private readonly enterEmoji = (input: HTMLInputElement, emojiIcon: string): void => {
    const {selectionStart: selection, value: text} = input;

    const textBeforeEmoji = text.substr(0, this.emojiStartPosition - 1);
    const textAfterEmoji = text.substr(selection);
    const newCursorPosition = textBeforeEmoji.length + emojiIcon.length;
    input.value = `${textBeforeEmoji}${emojiIcon}${textAfterEmoji}`;
    input.setSelectionRange(newCursorPosition, newCursorPosition);
    this.removeEmojiPopup();
    ko.utils.triggerEvent(input, 'change');
    $(input).focus();
  };

  private readonly closeEmojiPopup = (): void => {
    this.isVisible = false;
    window.removeEventListener('click', this.removeEmojiPopup);
    this.emojiDiv.remove();
  };

  removeEmojiPopup = (): void => {
    this.closeEmojiPopup();
    this.emojiStartPosition = -1;
  };

  private readonly getUsageCount = (emojiName: string): number => {
    return this.emojiUsageCount[emojiName] || 0;
  };

  private readonly increaseUsageCount = (emojiName: string): void => {
    this.emojiUsageCount[emojiName] = this.getUsageCount(emojiName) + 1;
    storeValue(StorageKey.CONVERSATION.EMOJI_USAGE_COUNT, this.emojiUsageCount);
  };

  private readonly escapeRegexp = (string: string): string => {
    return string.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  };
}
