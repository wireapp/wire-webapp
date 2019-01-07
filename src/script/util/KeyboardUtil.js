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

  const _insertAtCaret = (areaId, text) => {
    // http://stackoverflow.com/a/1064139
    const textArea = document.getElementById(areaId);
    if (!textArea) {
      return;
    }

    const scrollPos = textArea.scrollTop;
    let strPos = 0;
    const br = textArea.selectionStart || textArea.selectionStart === '0' ? 'ff' : document.selection ? 'ie' : false;

    if (br === 'ie') {
      textArea.focus();
      const range = document.selection.createRange();
      range.moveStart('character', -textArea.value.length);
      strPos = range.text.length;
    } else if (br === 'ff') {
      strPos = textArea.selectionStart;
    }

    const front = textArea.value.substring(0, strPos);
    const back = textArea.value.substring(strPos, textArea.value.length);

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

  const _isArrowKey = keyboardEvent => {
    return _isOneOfKeys(keyboardEvent, [
      KEYBOARD_KEY.ARROW_DOWN,
      KEYBOARD_KEY.ARROW_LEFT,
      KEYBOARD_KEY.ARROW_RIGHT,
      KEYBOARD_KEY.ARROW_UP,
    ]);
  };

  const _isBackspaceKey = keyboardEvent => _isKey(keyboardEvent, KEYBOARD_KEY.BACKSPACE);
  const _isDeleteKey = keyboardEvent => _isKey(keyboardEvent, KEYBOARD_KEY.DELETE);
  const _isEnterKey = keyboardEvent => _isKey(keyboardEvent, KEYBOARD_KEY.ENTER);
  const _isEscapeKey = keyboardEvent => _isKey(keyboardEvent, KEYBOARD_KEY.ESC);

  const _isFunctionKey = keyboardEvent => {
    return keyboardEvent.altKey || keyboardEvent.ctrlKey || keyboardEvent.metaKey || keyboardEvent.shiftKey;
  };

  const _isKey = (keyboardEvent = {}, expectedKey = '') => {
    const eventKey = keyboardEvent.key ? keyboardEvent.key.toLowerCase() : '';
    return eventKey === expectedKey.toLowerCase();
  };

  const _isMetaKey = keyboardEvent => keyboardEvent.metaKey || keyboardEvent.ctrlKey;

  const _isOneOfKeys = (keyboardEvent, expectedKeys = []) => {
    expectedKeys = expectedKeys.map(key => key.toLowerCase());

    const eventKey = keyboardEvent.key ? keyboardEvent.key.toLowerCase() : '';
    return !!expectedKeys.find(key => key === eventKey);
  };

  const _isPasteAction = keyboardEvent => {
    return _isMetaKey(keyboardEvent) && _isKey(keyboardEvent, KEYBOARD_KEY.KEY_V);
  };

  const _isRemovalAction = keyboardEvent => {
    return _isOneOfKeys(keyboardEvent, [KEYBOARD_KEY.BACKSPACE, KEYBOARD_KEY.DELETE]);
  };

  return {
    KEY: KEYBOARD_KEY,
    insertAtCaret: _insertAtCaret,
    isArrowKey: _isArrowKey,
    isBackspaceKey: _isBackspaceKey,
    isDeleteKey: _isDeleteKey,
    isEnterKey: _isEnterKey,
    isEscapeKey: _isEscapeKey,
    isFunctionKey: _isFunctionKey,
    isKey: _isKey,
    isMetaKey: _isMetaKey,
    isOneOfKeys: _isOneOfKeys,
    isPasteAction: _isPasteAction,
    isRemovalAction: _isRemovalAction,
  };
})();
