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

import {Environment} from './Environment';

export const KEY = {
  ARROW_DOWN: Environment.browser.edge ? 'Down' : 'ArrowDown',
  ARROW_LEFT: Environment.browser.edge ? 'Left' : 'ArrowLeft',
  ARROW_RIGHT: Environment.browser.edge ? 'Right' : 'ArrowRight',
  ARROW_UP: Environment.browser.edge ? 'Up' : 'ArrowUp',
  BACKSPACE: 'Backspace',
  DELETE: 'Delete',
  ENTER: 'Enter',
  ESC: 'Escape',
  KEY_V: 'v',
  SPACE: ' ',
  TAB: 'Tab',
};

export const isOneOfKeys = (keyboardEvent, expectedKeys = []) => {
  expectedKeys = expectedKeys.map(key => key.toLowerCase());
  const eventKey = keyboardEvent.key ? keyboardEvent.key.toLowerCase() : '';
  return !!expectedKeys.find(key => key === eventKey);
};

export const isArrowKey = keyboardEvent =>
  isOneOfKeys(keyboardEvent, [KEY.ARROW_DOWN, KEY.ARROW_LEFT, KEY.ARROW_RIGHT, KEY.ARROW_UP]);

export const isKey = (keyboardEvent = {}, expectedKey = '') => {
  const eventKey = keyboardEvent.key ? keyboardEvent.key.toLowerCase() : '';
  return eventKey === expectedKey.toLowerCase();
};

export const isEnterKey = keyboardEvent => isKey(keyboardEvent, KEY.ENTER);

export const isEscapeKey = keyboardEvent => isKey(keyboardEvent, KEY.ESC);

export const isFunctionKey = keyboardEvent =>
  keyboardEvent.altKey || keyboardEvent.ctrlKey || keyboardEvent.metaKey || keyboardEvent.shiftKey;

export const isMetaKey = keyboardEvent => keyboardEvent.metaKey || keyboardEvent.ctrlKey;

export const isPasteAction = keyboardEvent => isMetaKey(keyboardEvent) && isKey(keyboardEvent, KEY.KEY_V);

export const isRemovalAction = keyboardEvent => isOneOfKeys(keyboardEvent, [KEY.BACKSPACE, KEY.DELETE]);

export const insertAtCaret = (areaId, text) => {
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

const escKeyHandlers = [];

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    escKeyHandlers.forEach(handler => handler(event));
  }
});

export const onEscKey = handler => escKeyHandlers.push(handler);

export const offEscKey = handler => {
  const index = escKeyHandlers.indexOf(handler);
  if (index >= 0) {
    escKeyHandlers.splice(index, 1);
  }
};
