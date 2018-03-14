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

'use strict';

window.z = window.z || {};
window.z.viewModel = z.viewModel || {};
window.z.viewModel.content = z.viewModel.content || {};

const EMOJI_LIST_LENGTH = 5;
const EMOJI_LIST_OFFSET_LEFT = 8;
const EMOJI_LIST_OFFSET_TOP = 8;

// DO NOT USE COLON WITH LOWERCASE LETTERS IN THE SHORTCUTS, or you will prevent searching emojis.
// For example, while :D should be replaced with unicode symbol, :d should allow searching for :dancer:
/* eslint-disable sort-keys, no-multi-spaces */
const EMOJI_INLINE_REPLACEMENT = [
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
  if (first.shortcut.length !== second.shortcut.length) {
    return second.shortcut.length - first.shortcut.length;
  }
  return first.shortcut.localeCompare(second.shortcut);
});
/* eslint-enable sort-keys, no-multi-spaces */

const EMOJI_INLINE_MAX_LENGTH = Math.max(...EMOJI_INLINE_REPLACEMENT.map(item => item.shortcut.length));

z.viewModel.content.EmojiInputViewModel = class EmojiInputViewModel {
  constructor(mainViewModel, contentViewModel, repositories) {
    this.remove_emoji_popup = this.remove_emoji_popup.bind(this);
    this.updated_emoji_replace_preference = this.updated_emoji_replace_preference.bind(this);

    const emoji_div_class = 'conversation-input-bar-emoji-list';

    this.emoji_list = [];
    this.emoji_dict = {};

    this.emoji_div = $(`<div class='${emoji_div_class}' />`);
    this.emoji_start_pos = -1;
    this.emoji_usage_count = z.util.StorageUtil.getValue(z.storage.StorageKey.CONVERSATION.EMOJI_USAGE_COUNT) || {};

    this.should_replace_inline_emoji = repositories.properties.getPreference(
      z.properties.PROPERTIES_TYPE.EMOJI.REPLACE_INLINE
    );

    $(document).on('click', `.${emoji_div_class}`, event => {
      const clicked = $(event.target);
      const emoji_line = clicked.hasClass('emoji') ? clicked : clicked.closest('.emoji');
      const [input] = $('#conversation-input-bar-text');
      this._enter_emoji_popup_line(input, emoji_line);
      return false;
    });

    $(document).on('mouseenter', `.${emoji_div_class} .emoji`, event => {
      $(`.${emoji_div_class} .emoji`).removeClass('selected');
      $(event.currentTarget).addClass('selected');
    });

    fetch('/image/emoji.json')
      .then(response => response.json())
      .then(json => {
        for (const code in json) {
          const details = json[code];

          // Ignore 'tone' emojis for now, they clutter suggestions too much.
          if (details.alpha_code.match(/_tone\d/)) {
            continue;
          }

          const icon = String.fromCodePoint.apply(null, details.output.split('-').map(char => `0x${char}`));
          const alpha_codes = [details.alpha_code, ...details.aliases.split('|')];
          alpha_codes.forEach(alpha_code => {
            if (alpha_code) {
              const name = alpha_code
                .slice(1, -1)
                .replace(/_/g, ' ')
                .toLowerCase();
              this.emoji_list.push({icon, name});
              this.emoji_dict[name] = icon;
            }
          });
        }
      });

    this._init_subscriptions();
  }

  on_input_key_down(data, keyboard_event) {
    const input = keyboard_event.target;

    // Handling just entered inline emoji
    switch (keyboard_event.key) {
      case z.util.KeyboardUtil.KEY.SPACE:
        if (this._try_replace_inline_emoji(input)) {
          return false;
        }
        break;
      case z.util.KeyboardUtil.KEY.TAB:
        if (this._try_replace_inline_emoji(input)) {
          keyboard_event.preventDefault();
          return true;
        }
        break;
      default:
        break;
    }

    // Handling emoji popup
    if (this.emoji_div.is(':visible')) {
      switch (keyboard_event.key) {
        case z.util.KeyboardUtil.KEY.ESC:
          this.remove_emoji_popup();
          keyboard_event.preventDefault();
          return true;
        case z.util.KeyboardUtil.KEY.ARROW_UP:
        case z.util.KeyboardUtil.KEY.ARROW_DOWN:
          this._rotate_emoji_popup(z.util.KeyboardUtil.isKey(keyboard_event, z.util.KeyboardUtil.KEY.ARROW_UP));
          this.suppress_key_up = true;
          keyboard_event.preventDefault();
          return true;
        case z.util.KeyboardUtil.KEY.ENTER:
        case z.util.KeyboardUtil.KEY.TAB:
          if (keyboard_event.shiftKey && z.util.KeyboardUtil.isEnterKey(keyboard_event)) {
            break;
          }
          this._enter_emoji_popup_line(input, this.emoji_div.find('.emoji.selected'));
          keyboard_event.preventDefault();
          return true;
        default:
          break;
      }
    }

    // Handling inline emoji in the whole text
    if (z.util.KeyboardUtil.isEnterKey(keyboard_event)) {
      this._replace_all_inline_emoji(input);
    }

    return false;
  }

  on_input_key_up(data, keyboard_event) {
    if (this.suppress_key_up) {
      this.suppress_key_up = false;
      return true;
    }

    const input = keyboard_event.target;
    const {selectionStart: selection, value: text} = input;

    if (text) {
      const popup_trigger = text.slice(Math.max(selection - 2, 0), selection);
      if (/\B:$/.test(popup_trigger)) {
        this.emoji_start_pos = selection;
        this._update_emoji_popup(input);
      } else if (this.emoji_start_pos !== -1) {
        if (selection < this.emoji_start_pos || text[this.emoji_start_pos - 1] !== ':') {
          this.remove_emoji_popup();
        } else {
          this._update_emoji_popup(input);
        }
      }
    }

    return true;
  }

  _init_subscriptions() {
    amplify.subscribe(z.event.WebApp.CONTENT.SWITCH, this.remove_emoji_popup);
    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATE.EMOJI.REPLACE_INLINE, this.updated_emoji_replace_preference);
    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATED, properties => {
      this.updated_emoji_replace_preference(properties.settings.emoji.replace_inline);
    });
  }

  updated_emoji_replace_preference(preference) {
    return (this.should_replace_inline_emoji = preference);
  }

  _try_replace_inline_emoji(input) {
    const {selectionStart: selection, value: text} = input;

    if (this.should_replace_inline_emoji && text) {
      const text_until_cursor = text.substring(Math.max(0, selection - EMOJI_INLINE_MAX_LENGTH - 1), selection);

      for (const replacement of EMOJI_INLINE_REPLACEMENT) {
        const icon = this.emoji_dict[replacement.name];
        if (icon) {
          const valid_inline_emoji_regexp = new RegExp(`(^|\\s)${this._escape_regexp(replacement.shortcut)}$`);

          if (valid_inline_emoji_regexp.test(text_until_cursor)) {
            this.emoji_start_pos = selection - replacement.shortcut.length + 1;
            this._enter_emoji(input, icon);

            return true;
          }
        }
      }
    }

    return false;
  }

  _replace_all_inline_emoji(input) {
    if (!this.should_replace_inline_emoji) {
      return false;
    }

    const {selectionStart: selection, value: text} = input;
    let text_before_cursor = text.substr(0, selection);
    let text_after_cursor = text.substr(selection);

    for (const replacement of EMOJI_INLINE_REPLACEMENT) {
      const icon = this.emoji_dict[replacement.name];

      if (icon) {
        const valid_inline_emoji_regexp = new RegExp(
          `(^|\\s)${this._escape_regexp(replacement.shortcut)}(?=\\s|$)`,
          'g'
        );
        text_before_cursor = text_before_cursor.replace(valid_inline_emoji_regexp, `$1${icon}`);
        text_after_cursor = text_after_cursor.replace(valid_inline_emoji_regexp, `$1${icon}`);
      }
    }

    input.value = `${text_before_cursor}${text_after_cursor}`;
    input.setSelectionRange(text_before_cursor.length, text_before_cursor.length);
    $(input).change();
    $(input).focus();
  }

  _update_emoji_popup(input) {
    const {selectionStart: selection, value: text} = input;
    if (!text) {
      return;
    }

    const query = text.substr(this.emoji_start_pos, selection - this.emoji_start_pos);
    if (!query.length) {
      return this._close_emoji_popup();
    }

    if (!this.emoji_list.length || query.startsWith(' ') || /\s{2,}/.test(query)) {
      return this.remove_emoji_popup();
    }

    const query_words = query.split(' ');
    const expected_words = (query.match(/\s/g) || []).length + 1;

    const emoji_matched = this.emoji_list
      .filter(emoji => {
        const emoji_name_words = emoji.name.split(' ');

        if (emoji_name_words.length < expected_words) {
          return false;
        }

        return query_words.every(query_word =>
          emoji_name_words.some(emoji_name_word => emoji_name_word.startsWith(query_word))
        );
      })
      .reduce((acc, emoji, index) => {
        if (!acc.find(item => item.icon === emoji.icon)) {
          acc.push(emoji);
        }
        return acc;
      }, [])
      .sort((emoji_a, emoji_b) => {
        const usage_count_a = this._get_usage_count(emoji_a.name);
        const usage_count_b = this._get_usage_count(emoji_b.name);
        if (usage_count_a === usage_count_b) {
          return z.util.StringUtil.sortByPriority(emoji_a.name, emoji_b.name, query);
        }
        return usage_count_b - usage_count_a;
      })
      .slice(0, EMOJI_LIST_LENGTH)
      .map(
        emoji =>
          `<div class='emoji'><span class='symbol'>${emoji.icon}</span><span class='name'>${emoji.name}</span></div>`
      )
      .join('');

    if (emoji_matched === '') {
      return this._close_emoji_popup();
    }

    window.addEventListener('click', this.remove_emoji_popup);
    this.emoji_div
      .html(emoji_matched)
      .appendTo('body')
      .show();
    this.emoji_div.find('.emoji:nth(0)').addClass('selected');

    const pos = this._get_cursor_pixel_pos(input);
    const top = pos.top - this.emoji_div.height() - EMOJI_LIST_OFFSET_TOP;
    const left = pos.left - EMOJI_LIST_OFFSET_LEFT;

    this.emoji_div.css('left', left);
    this.emoji_div.css('top', top);
  }

  _rotate_emoji_popup(backward) {
    const previous = this.emoji_div.find('.emoji.selected');
    const new_selection = (previous.index() + (backward ? -1 : 1)) % this.emoji_div.find('.emoji').length;
    previous.removeClass('selected');
    this.emoji_div.find(`.emoji:nth(${new_selection})`).addClass('selected');
  }

  _enter_emoji_popup_line(input, emoji_line) {
    const emoji_icon = emoji_line.find('.symbol').text();
    const emoji_name = emoji_line
      .find('.name')
      .text()
      .toLowerCase();
    this._enter_emoji(input, emoji_icon);
    this._inc_usage_count(emoji_name); // only emojis selected from the list should affect the count
  }

  _enter_emoji(input, emoji_icon) {
    const {selectionStart: selection, value: text} = input;

    const text_before_emoji = text.substr(0, this.emoji_start_pos - 1);
    const text_after_emoji = text.substr(selection);
    const new_cursor_pos = text_before_emoji.length + emoji_icon.length;
    input.value = `${text_before_emoji}${emoji_icon}${text_after_emoji}`;
    input.setSelectionRange(new_cursor_pos, new_cursor_pos);
    this.remove_emoji_popup();
    $(input).change();
    $(input).focus();
  }

  _close_emoji_popup() {
    window.removeEventListener('click', this.remove_emoji_popup);
    this.emoji_div.remove();
  }

  remove_emoji_popup() {
    this._close_emoji_popup();
    this.emoji_start_pos = -1;
  }

  _get_cursor_pixel_pos(input) {
    const css = getComputedStyle(input);
    const ibr = input.getBoundingClientRect();
    const mask = document.createElement('div');
    const span = document.createElement('span');
    const text = document.createTextNode(input.value);

    mask.appendChild(text);
    mask.style.font = css.font;
    mask.style.position = 'fixed';
    mask.style.left = `${input.clientLeft + ibr.left}px`;
    mask.style.top = `${input.clientTop + ibr.top}px`;
    mask.style.color = 'red';
    mask.style.overflow = 'scroll';
    mask.style.visibility = 'hidden';
    mask.style.whiteSpace = 'pre-wrap';
    mask.style.padding = css.padding;
    mask.style.width = css.width;
    mask.style.height = css.height;
    span.innerText = 'I';

    const pos = input.selectionStart;
    if (pos === input.value.length) {
      mask.appendChild(span);
    } else {
      mask.insertBefore(span, mask.childNodes[0].splitText(pos));
    }
    document.body.appendChild(mask);
    span.scrollIntoView();

    const sbr = span.getBoundingClientRect();

    mask.remove();
    return sbr;
  }

  _get_usage_count(emoji_name) {
    return this.emoji_usage_count[emoji_name] || 0;
  }

  _inc_usage_count(emoji_name) {
    this.emoji_usage_count[emoji_name] = this._get_usage_count(emoji_name) + 1;
    z.util.StorageUtil.setValue(z.storage.StorageKey.CONVERSATION.EMOJI_USAGE_COUNT, this.emoji_usage_count);
  }

  _escape_regexp(str) {
    return str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  }
};
