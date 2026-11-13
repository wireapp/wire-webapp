/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {type RefObject, useEffect} from 'react';

import {isNullOrUndefined} from '@sindresorhus/is';

import {isEscapeKey} from '../util/keyboardUtil';

interface CloseOnEscapeOptions {
  /**
   * Take Escape away from the rest of the page while focus is inside rootRef. Use it when the overlay
   * sits inside a modal that also closes on Escape, so one press closes the overlay only. With focus
   * elsewhere (a device menu, a dialog on top), Escape goes where it would have gone.
   */
  readonly captureEscapeWhenFocused: boolean;
  /** Close when keyboard focus moves outside rootRef, so an overlay never stays open over what Tab reaches next. */
  readonly closeOnFocusOut?: boolean;
}

/**
 * While an overlay is open, Escape and a press outside rootRef close it.
 * Listens on the root's own document, so it also works in the detached calling window.
 */
export const useCloseOnEscapeOrOutsidePress = (
  rootRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  onEscape: () => void,
  onOutsidePress: () => void,
  {captureEscapeWhenFocused, closeOnFocusOut = false}: CloseOnEscapeOptions = {captureEscapeWhenFocused: false},
): void => {
  useEffect((): void | (() => void) => {
    const ownerDocument = rootRef.current?.ownerDocument;

    if (!isOpen || isNullOrUndefined(ownerDocument)) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!isEscapeKey(event)) {
        return;
      }
      if (captureEscapeWhenFocused) {
        const isFocusInside = rootRef.current?.contains(ownerDocument.activeElement) ?? false;
        if (!isFocusInside) {
          return;
        }
        event.stopPropagation();
      }
      onEscape();
    };
    // A press, or a focus move with closeOnFocusOut, that lands outside the root.
    const closeIfOutside = (event: Event): void => {
      if (rootRef.current !== null && !event.composedPath().includes(rootRef.current)) {
        onOutsidePress();
      }
    };

    ownerDocument.addEventListener('keydown', handleKeyDown, {capture: captureEscapeWhenFocused});
    ownerDocument.addEventListener('mousedown', closeIfOutside);
    if (closeOnFocusOut) {
      ownerDocument.addEventListener('focusin', closeIfOutside);
    }

    return () => {
      ownerDocument.removeEventListener('keydown', handleKeyDown, {capture: captureEscapeWhenFocused});
      ownerDocument.removeEventListener('mousedown', closeIfOutside);
      ownerDocument.removeEventListener('focusin', closeIfOutside);
    };
  }, [captureEscapeWhenFocused, closeOnFocusOut, isOpen, onEscape, onOutsidePress, rootRef]);
};
