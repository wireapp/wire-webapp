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

import type {KeyboardEvent as ReactKeyboardEvent, SyntheticEvent as ReactEvent} from 'react';

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
} as const;

export const isOneOfKeys = (keyboardEvent: KeyboardEvent | ReactKeyboardEvent, expectedKeys: string[] = []) => {
  expectedKeys = expectedKeys.map(key => key.toLowerCase());
  const eventKey = keyboardEvent.key?.toLowerCase() || '';
  return !!expectedKeys.find(key => key === eventKey);
};

export const isArrowKey = (keyboardEvent: KeyboardEvent): boolean =>
  isOneOfKeys(keyboardEvent, [KEY.ARROW_DOWN, KEY.ARROW_LEFT, KEY.ARROW_RIGHT, KEY.ARROW_UP]);

export const isPageUpDownKey = (keyboardEvent: KeyboardEvent): boolean =>
  isOneOfKeys(keyboardEvent, [KEY.PAGE_UP, KEY.PAGE_DOWN]);

export const isKey = (keyboardEvent?: KeyboardEvent | ReactKeyboardEvent, expectedKey = '') => {
  const eventKey = keyboardEvent?.key?.toLowerCase() || '';
  return eventKey === expectedKey.toLowerCase();
};

export const isKeyboardEvent = (event: Event | ReactEvent): event is KeyboardEvent | ReactKeyboardEvent => {
  return 'key' in event;
};

export const isTabKey = (keyboardEvent: KeyboardEvent | ReactKeyboardEvent): boolean => isKey(keyboardEvent, KEY.TAB);

export const isEnterKey = (keyboardEvent: KeyboardEvent | ReactKeyboardEvent): boolean =>
  isKey(keyboardEvent, KEY.ENTER);

export const isSpaceKey = (keyboardEvent: KeyboardEvent): boolean => isKey(keyboardEvent, KEY.SPACE);

export const isEscapeKey = (keyboardEvent: KeyboardEvent | ReactKeyboardEvent): boolean =>
  isKey(keyboardEvent, KEY.ESC);

export const isFunctionKey = (keyboardEvent: KeyboardEvent | ReactKeyboardEvent): boolean =>
  keyboardEvent.altKey || keyboardEvent.ctrlKey || keyboardEvent.metaKey || keyboardEvent.shiftKey;

/** On macOS the meta key is '⌘', which represents 'Ctrl' in the Windows world: https://www.oreilly.com/library/view/switching-to-the/9781449372927/ch01s08.html */
export const isMetaKey = (keyboardEvent: KeyboardEvent): boolean =>
  keyboardEvent.metaKey || keyboardEvent.ctrlKey || keyboardEvent.key?.toLowerCase() === 'control';

export const isPasteAction = (keyboardEvent: KeyboardEvent): boolean =>
  isMetaKey(keyboardEvent) && isKey(keyboardEvent, KEY.KEY_V);

const removalKeys: string[] = [KEY.BACKSPACE, KEY.DELETE];
export const isRemovalAction = (key: string): boolean => removalKeys.includes(key);

export const isSpaceOrEnterKey = (key: string): boolean => key === KEY.SPACE || key === KEY.ENTER;

export const handleKeyDown = (
  event: ReactKeyboardEvent<Element> | KeyboardEvent,
  callback: (event?: ReactKeyboardEvent<Element> | KeyboardEvent) => void,
) => {
  if (event.key === KEY.ENTER || event.key === KEY.SPACE) {
    callback(event);
  }
  return true;
};

export const handleEnterDown = (event: ReactKeyboardEvent<HTMLElement> | KeyboardEvent, callback: () => void): void => {
  if (event.key === KEY.ENTER) {
    callback();
  }
};

export const handleEscDown = (event: ReactKeyboardEvent<Element> | KeyboardEvent, callback: () => void): void => {
  if (event?.key === KEY.ESC) {
    callback();
  }
};

/**
 * Handles global key press event - calls onPress when the key is pressed and onRelease when the key is released.
 * @note The onPress is called only once when the key is pressed (it is not called repeatedly when key is held down).
 * @param key The key to listen to.
 * @param onPress A function to call when the key is pressed.
 * @param onRelease A function to call when the key is released.
 * @returns A function to unsubscribe.
 */
export const handleKeyPress = (
  key: string,
  element: Window | null = window,
  {onPress, onRelease}: {onPress: () => void; onRelease: () => void},
) => {
  let isKeyDown = false;

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== key) {
      return;
    }

    // Do nothing if the key press was already registered.
    if (isKeyDown) {
      return;
    }

    isKeyDown = true;

    onPress();
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    if (event.key !== key) {
      return;
    }

    // If the key was not pressed, we do nothing.
    if (!isKeyDown) {
      return;
    }

    // Release the key.
    isKeyDown = false;

    onRelease();
  };

  element?.addEventListener('keydown', handleKeyDown, true);
  element?.addEventListener('keyup', handleKeyUp, true);

  return () => {
    element?.removeEventListener('keydown', handleKeyDown, true);
    element?.removeEventListener('keyup', handleKeyUp, true);
  };
};
