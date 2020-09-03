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

import {Runtime} from '@wireapp/commons';

export const KEY = {
  ARROW_DOWN: Runtime.isEdge() ? 'Down' : 'ArrowDown',
  ARROW_LEFT: Runtime.isEdge() ? 'Left' : 'ArrowLeft',
  ARROW_RIGHT: Runtime.isEdge() ? 'Right' : 'ArrowRight',
  ARROW_UP: Runtime.isEdge() ? 'Up' : 'ArrowUp',
  BACKSPACE: 'Backspace',
  DELETE: 'Delete',
  ENTER: 'Enter',
  ESC: 'Escape',
  KEY_V: 'v',
  PAGE_DOWN: 'PageDown',
  PAGE_UP: 'PageUp',
  SPACE: ' ',
  TAB: 'Tab',
};

export const isOneOfKeys = (keyboardEvent: KeyboardEvent, expectedKeys: string[] = []) => {
  expectedKeys = expectedKeys.map(key => key.toLowerCase());
  const eventKey = keyboardEvent.key ? keyboardEvent.key.toLowerCase() : '';
  return !!expectedKeys.find(key => key === eventKey);
};

export const isArrowKey = (keyboardEvent: KeyboardEvent): boolean =>
  isOneOfKeys(keyboardEvent, [KEY.ARROW_DOWN, KEY.ARROW_LEFT, KEY.ARROW_RIGHT, KEY.ARROW_UP]);

export const isPageUpDownKey = (keyboardEvent: KeyboardEvent): boolean =>
  isOneOfKeys(keyboardEvent, [KEY.PAGE_UP, KEY.PAGE_DOWN]);

export const isKey = (keyboardEvent?: KeyboardEvent, expectedKey = '') => {
  const eventKey = keyboardEvent?.key.toLowerCase() || '';
  return eventKey === expectedKey.toLowerCase();
};

export const isEnterKey = (keyboardEvent: KeyboardEvent): boolean => isKey(keyboardEvent, KEY.ENTER);

export const isSpaceKey = (keyboardEvent: KeyboardEvent): boolean => isKey(keyboardEvent, KEY.SPACE);

export const isEscapeKey = (keyboardEvent: KeyboardEvent): boolean => isKey(keyboardEvent, KEY.ESC);

export const isFunctionKey = (keyboardEvent: KeyboardEvent): boolean =>
  keyboardEvent.altKey || keyboardEvent.ctrlKey || keyboardEvent.metaKey || keyboardEvent.shiftKey;

export const isMetaKey = (keyboardEvent: KeyboardEvent): boolean => keyboardEvent.metaKey || keyboardEvent.ctrlKey;

export const isPasteAction = (keyboardEvent: KeyboardEvent): boolean =>
  isMetaKey(keyboardEvent) && isKey(keyboardEvent, KEY.KEY_V);

export const isRemovalAction = (keyboardEvent: KeyboardEvent): boolean =>
  isOneOfKeys(keyboardEvent, [KEY.BACKSPACE, KEY.DELETE]);

export const insertAtCaret = (areaId: string, text: string) => {
  // http://stackoverflow.com/a/1064139
  const textArea = document.getElementById(areaId) as HTMLTextAreaElement;
  if (!textArea) {
    return;
  }

  const scrollPos = textArea.scrollTop;
  let strPos = 0;
  const br =
    textArea.selectionStart || textArea.selectionStart === 0 ? 'ff' : (document as any).selection ? 'ie' : false;

  if (br === 'ie') {
    textArea.focus();
    const range = (document as any).selection.createRange();
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
    const ieRange = (document as any).selection.createRange();
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

type KeyboardHandler = (event: KeyboardEvent) => void;

const escKeyHandlers: KeyboardHandler[] = [];

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    escKeyHandlers.forEach(handler => handler(event));
  }
});

export const onEscKey = (handler: KeyboardHandler) => escKeyHandlers.push(handler);

export const offEscKey = (handler: KeyboardHandler) => {
  const index = escKeyHandlers.indexOf(handler);
  if (index >= 0) {
    escKeyHandlers.splice(index, 1);
  }
};
