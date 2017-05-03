/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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
z.ViewModel = z.ViewModel || {};

const EMOJI_LIST_LENGTH = 5;
const EMOJI_LIST_OFFSET_LEFT = 8;
const EMOJI_LIST_OFFSET_TOP = 8;
const QUERY_MIN_LENGTH = 1;

z.ViewModel.ConversationInputEmojiViewModel = class ConversationInputEmojiViewModel {
  constructor() {
    const emoji_list_class = 'conversation-input-emoji-list';

    this.emoji_list = $(`<div class='${emoji_list_class}' />`);
    this.emoji_dict = undefined;
    this.emoji_start_pos = -1;
    this.emoji_usage_count = z.util.StorageUtil.get_value(z.storage.StorageKey.CONVERSATION.EMOJI_USAGE_COUNT) || {};

    $(document).on('click', `.${emoji_list_class}`, (event) => {
      const clicked = $(event.target);
      const emoji = clicked.hasClass('emoji') ? clicked : clicked.closest('.emoji');
      const input = $('#conversation-input-text')[0];
      this.enter_emoji(input, emoji);
      return false;
    });

    $(document).on('mouseenter', `.${emoji_list_class} .emoji`, (event) => {
      $(`.${emoji_list_class} .emoji`).removeClass('selected');
      $(event.currentTarget).addClass('selected');
    });

    fetch('/image/emoji.tsv')
      .then((response) => response.text())
      .then((text) => {
        this.emoji_dict = text.split('\n').filter((e) => e.length > 0);
      });

    this.bound_remove_emoji_list = this.remove_emoji_list.bind(this);
    this._init_subscriptions();
  }

  _init_subscriptions() {
    amplify.subscribe(z.event.WebApp.CONTENT.SWITCH, () => this.remove_emoji_list());
  }

  on_input_key_down(data, event) {
    if (this.emoji_list.is(':hidden')) {
      return false;
    }

    switch (event.keyCode) {
      case z.util.KEYCODE.ESC:
        this.remove_emoji_list();
        break;
      case z.util.KEYCODE.ARROW_UP:
      case z.util.KEYCODE.ARROW_DOWN:
        this.rotate_emoji_list(event.keyCode === z.util.KEYCODE.ARROW_UP);
        this.suppress_key_up = true;
        break;
      case z.util.KEYCODE.ENTER:
      case z.util.KEYCODE.TAB:
        this.enter_emoji(event.target, this.emoji_list.find('.emoji.selected'));
        break;
      default:
        return false;
    }

    event.preventDefault();
    return true;
  }

  on_input_key_up(data, event) {
    if (!this.suppress_key_up) {
      const input = event.target;
      const text = input.value || '';

      if (text[input.selectionStart - 1] === ':') {
        this.emoji_start_pos = input.selectionStart;
        this.update_emoji_list(input);
      } else if (this.emoji_start_pos !== -1) {
        if (input.selectionStart < this.emoji_start_pos || text[this.emoji_start_pos - 1] !== ':') {
          this.remove_emoji_list();
        } else {
          this.update_emoji_list(input);
        }
      }
    }

    this.suppress_key_up = false;
    return true;
  }

  update_emoji_list(input) {
    if (!input.value) {
      return;
    }

    const query = input.value.substr(this.emoji_start_pos, input.selectionStart - this.emoji_start_pos).toLowerCase();
    if (query.length < QUERY_MIN_LENGTH || query[0] === ' ' || !this.emoji_dict) {
      this.emoji_list.remove();
    } else {
      const query_words = query.split(' ');
      const emoji_matched = this.emoji_dict
        .filter((emoji) => {
          const [, emoji_name] = emoji.split('\t');
          const emoji_name_words = emoji_name.split(' ');
          return query_words.every((query_word) => emoji_name_words.some((emoji_name_word) => emoji_name_word.startsWith(query_word)));
        })
        .sort((emoji_a, emoji_b) => {
          const [, emoji_name_a] = emoji_a.split('\t');
          const [, emoji_name_b] = emoji_b.split('\t');
          const usage_count_a = this.get_usage_count(emoji_name_a);
          const usage_count_b = this.get_usage_count(emoji_name_b);
          if (usage_count_a === usage_count_b) {
            return z.util.StringUtil.sort_by_priority(emoji_name_a, emoji_name_b, query);
          }
          return usage_count_b - usage_count_a;
        })
        .slice(0, EMOJI_LIST_LENGTH)
        .map((emoji) => {
          const [code, name] = emoji.split('\t');
          const parsed_unicode_emoji = String.fromCodePoint.apply(null, code.split(','));
          return `<div class='emoji'><span class='symbol'>${parsed_unicode_emoji}</span><span class='name'>${name}</span></div>`;
        })
        .join('');

      if (emoji_matched === '') {
        this.close_emoji_list();
      } else {
        window.addEventListener('click', this.bound_remove_emoji_list);
        this.emoji_list
          .html(emoji_matched)
          .appendTo('body')
          .show();
        this.emoji_list.find('.emoji:nth(0)').addClass('selected');

        const pos = this.get_cursor_pixel_pos(input);
        const top = pos.top - this.emoji_list.height() - EMOJI_LIST_OFFSET_TOP;
        const left = pos.left - EMOJI_LIST_OFFSET_LEFT;

        this.emoji_list.css('left', left);
        this.emoji_list.css('top', top);
      }
    }
  }

  rotate_emoji_list(backward) {
    const previous = this.emoji_list.find('.emoji.selected');
    const new_selection = (previous.index() + (backward ? -1 : 1)) % this.emoji_list.find('.emoji').length;
    previous.removeClass('selected');
    this.emoji_list.find(`.emoji:nth(${new_selection})`).addClass('selected');
  }

  enter_emoji(input, emoji_line) {
    const emoji = emoji_line.find('.symbol').text();
    const emoji_name = emoji_line.find('.name').text();
    this.inc_usage_count(emoji_name);
    const text_before_emoji = input.value.substr(0, this.emoji_start_pos - 1);
    const text_after_emoji = input.value.substr(input.selectionStart);
    input.value = `${text_before_emoji}${emoji}${text_after_emoji}`;
    input.setSelectionRange(this.emoji_start_pos, this.emoji_start_pos);
    this.remove_emoji_list();
    $(input).change();
    $(input).focus();
  }

  close_emoji_list() {
    window.removeEventListener('click', this.bound_remove_emoji_list);
    this.emoji_list.remove();
  }

  remove_emoji_list() {
    this.close_emoji_list();
    this.emoji_start_pos = -1;
  }

  get_cursor_pixel_pos(input) {
    const css = getComputedStyle(input);
    const ibr = input.getBoundingClientRect();
    const mask = document.createElement('div');
    const span = document.createElement('span');

    mask.style.font = css.font;
    mask.style.position = 'fixed';
    mask.innerHTML = input.value;
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

  get_usage_count(emoji_name) {
    return this.emoji_usage_count[emoji_name.toLowerCase()] || 0;
  }

  inc_usage_count(emoji_name) {
    emoji_name = emoji_name.toLowerCase();
    this.emoji_usage_count[emoji_name] = this.get_usage_count(emoji_name) + 1;
    z.util.StorageUtil.set_value(z.storage.StorageKey.CONVERSATION.EMOJI_USAGE_COUNT, this.emoji_usage_count);
  }
};
