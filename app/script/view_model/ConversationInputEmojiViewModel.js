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

z.ViewModel.ConversationInputEmojiViewModel = class ConversationInputEmojiViewModel {
  constructor() {
    this.emoji_list = $('<div class="conversation-input-emoji-list" />');
    this.emoji_dict = undefined;
    this.emoji_start_pos = -1;

    $.get('/image/emoji.tsv', (text) => {
      this.emoji_dict = text.split('\n');
    });
  }

  on_input_key_down(data, event) {
    if (!this.emoji_list.is(':visible')) {
      return false;
    }

    switch (event.keyCode) {
      case z.util.KEYCODE.ESC:
        this.emoji_list.remove();
        this.emoji_start_pos = -1;
        break;
      case z.util.KEYCODE.ARROW_UP:
      case z.util.KEYCODE.ARROW_DOWN:
        this.rotate_emoji_list(event.keyCode === z.util.KEYCODE.ARROW_UP);
        this.suppress_key_up = true;
        break;
      case z.util.KEYCODE.ENTER: {
        let input = event.target;
        let emoji = this.emoji_list.find('>div.selected>span').html();
        let val = input.value;
        input.value = val.substr(0, this.emoji_start_pos - 1) + emoji + val.substr(input.selectionStart);
        input.setSelectionRange(this.emoji_start_pos, this.emoji_start_pos);
        this.emoji_list.remove();
        this.emoji_start_pos = -1;
        $(input).change();
        break;
      }
      default:
        return false;
    }

    event.preventDefault();
    return true;
  }

  on_input_key_up(data, event) {
    if (!this.suppress_key_up) {
      let input = event.target;
      let text = input.value || '';

      if (text[input.selectionStart - 1] === ':') {
        this.emoji_start_pos = input.selectionStart;
        this.update_emoji_list(input);
      } else if (this.emoji_start_pos !== -1) {
        if (input.selectionStart < this.emoji_start_pos || text[this.emoji_start_pos - 1] !== ':') {
          this.emoji_list.remove();
          this.emoji_start_pos = -1;
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

    let query = input.value.substr(this.emoji_start_pos, input.selectionStart - this.emoji_start_pos);
    if (query.length < 2 || query[0] === ' ' || !this.emoji_dict) {
      this.emoji_list.remove();
    } else {
      let emoji_matched = this.emoji_dict
        .filter((emoji) => emoji.indexOf(query) !== -1)
        .slice(0, 5)
        .map((emoji) => {
          let [code, name] = emoji.split('\t');
          let parsed_unicode_emoji = String.fromCodePoint.apply(null, code.split(','));
          return `<div><span>${parsed_unicode_emoji}</span>${name}</div>`;
        })
        .join('');

      if (emoji_matched === '') {
        this.emoji_list.remove();
      } else {
        this.emoji_list.html(emoji_matched).appendTo('body').show();
        this.emoji_list.find('>div:nth(0)').addClass('selected');

        let pos = this.get_cursor_pixel_pos(input);
        let top = pos.top - this.emoji_list.height();

        this.emoji_list.css('left', pos.left);
        this.emoji_list.css('top', top);
      }
    }
  }

  rotate_emoji_list(backward) {
    let previous = this.emoji_list.find('>div.selected');
    let new_selection = (previous.index() + (backward ? -1 : 1)) % this.emoji_list.find('>div').length;
    previous.removeClass('selected');
    this.emoji_list.find(`>div:nth(${new_selection})`).addClass('selected');
  }

  get_cursor_pixel_pos(input) {
    let css = getComputedStyle(input);
    let br = input.getBoundingClientRect();
    let mask = document.createElement('div');
    let span = document.createElement('span');

    mask.style.font = css.font;
    mask.style.position = 'fixed';
    mask.innerHTML = input.value;
    mask.style.left = (input.clientLeft + br.left) + 'px';
    mask.style.top = (input.clientTop + br.top) + 'px';
    mask.style.color = 'red';
    mask.style.overflow = 'scroll';
    mask.style.visibility = 'hidden';
    mask.style.whiteSpace = 'pre-wrap';
    mask.style.padding = css.padding;
    mask.style.width = css.width;
    mask.style.height = css.height;
    span.innerText = 'I';

    let pos = input.selectionStart;
    if (pos === input.value.length) {
      mask.appendChild(span);
    } else {
      mask.insertBefore(span, mask.childNodes[0].splitText(pos));
    }
    document.body.appendChild(mask);
    span.scrollIntoViewIfNeeded();

    br = span.getBoundingClientRect();

    mask.remove();
    return br;
  }
};
