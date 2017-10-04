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
window.z.util = z.util || {};

z.util.KeyboardUtil = (() => {

  const KEY_DEFAULT = {
    ARROW_DOWN: 'ArrowDown',
    ARROW_LEFT: 'ArrowLeft',
    ARROW_RIGHT: 'ArrowRight',
    ARROW_UP: 'ArrowUp',
    BACKSPACE: 'Backspace',
    DELETE: 'Delete',
    ENTER: 'Enter',
    ESC: 'Escape',
    KEY_V: 'v',
    SPACE: ' ',
    TAB: 'Tab',
  };

  const KEY_EDGE = {
    ARROW_DOWN: 'Down',
    ARROW_LEFT: 'Left',
    ARROW_RIGHT: 'Right',
    ARROW_UP: 'Up',
  };

  const KEYBOARD_KEY = z.util.Environment.browser.edge ? Object.assign(KEY_DEFAULT, KEY_EDGE) : KEY_DEFAULT;

  const _insert_at_caret = (areaId, text) => {
    // http://stackoverflow.com/a/1064139
    const textArea = document.getElementById(areaId);
    if (!textArea) {
      return;
    }

    const scrollPos = textArea.scrollTop;
    let strPos = 0;
    const br = ((textArea.selectionStart || textArea.selectionStart === '0') ? 'ff' : (document.selection ? 'ie' : false));

    if (br === 'ie') {
      textArea.focus();
      const range = document.selection.createRange();
      range.moveStart('character', -textArea.value.length);
      strPos = range.text.length;
    } else if (br === 'ff') {
      strPos = textArea.selectionStart;
    }

    const front = (textArea.value).substring(0, strPos);
    const back = (textArea.value).substring(strPos, textArea.value.length);

    textArea.value = `${front}${text}${back}`;
    strPos = strPos + text.length;

    if (br === 'ie') {
      textArea.focus();
      const ieRange = document.selection.createRange();
      ieRange.moveStart('character', -textArea.value.length);
      ieRange.moveStart('character', strPos);
      ieRange.moveEnd('character', 0);
      ieRange.select();
    } else if (br === 'ff') {
      textArea.selectionStart = strPos;
      textArea.selectionEnd = strPos;
      textArea.focus();
    }

    textArea.scrollTop = scrollPos;
  };

  const _is_arrow_key = (keyboard_event) => {
    return _is_one_of_keys(keyboard_event, [
      KEYBOARD_KEY.ARROW_DOWN,
      KEYBOARD_KEY.ARROW_LEFT,
      KEYBOARD_KEY.ARROW_RIGHT,
      KEYBOARD_KEY.ARROW_UP,
    ]);
  };

  const _is_backspace_key = (keyboard_event) => _is_key(keyboard_event, KEYBOARD_KEY.BACKSPACE);

  const _is_delete_key = (keyboard_event) => _is_key(keyboard_event, KEYBOARD_KEY.DELETE);

  const _is_enter_key = (keyboard_event) => _is_key(keyboard_event, KEYBOARD_KEY.ENTER);

  const _is_escape_key = (keyboard_event) => _is_key(keyboard_event, KEYBOARD_KEY.ESC);

  const _is_function_key = (keyboard_event) => {
    return keyboard_event.altKey || keyboard_event.ctrlKey || keyboard_event.metaKey || keyboard_event.shiftKey;
  };

  const _is_key = (keyboard_event = {}, expected_key = '') => {
    const key = keyboard_event.key ? keyboard_event.key : '';
    return key.toLowerCase() === expected_key.toLowerCase();
  };

  const _is_meta_key = (keyboard_event) => keyboard_event.metaKey || keyboard_event.ctrlKey;

  const _is_one_of_keys = (keyboard_event, expected_keys = []) => {
    expected_keys = expected_keys.map((key) => key.toLowerCase());

    const event_key = keyboard_event.key.toLowerCase();
    return !!expected_keys.find((key) => key === event_key);
  };

  const _is_paste_action = (keyboard_event) => {
    return _is_meta_key(keyboard_event) && _is_key(keyboard_event, KEYBOARD_KEY.KEY_V);
  };

  const _is_removal_action = (keyboard_event) => {
    return _is_one_of_keys(keyboard_event, [KEYBOARD_KEY.BACKSPACE, KEYBOARD_KEY.DELETE]);
  };

  return {
    KEY: KEYBOARD_KEY,
    insert_at_caret: _insert_at_caret,
    is_arrow_key: _is_arrow_key,
    is_backspace_key: _is_backspace_key,
    is_delete_key: _is_delete_key,
    is_enter_key: _is_enter_key,
    is_escape_key: _is_escape_key,
    is_function_key: _is_function_key,
    is_key: _is_key,
    is_meta_key: _is_meta_key,
    is_one_of_keys: _is_one_of_keys,
    is_paste_action: _is_paste_action,
    is_removal_action: _is_removal_action,
  };
})();
