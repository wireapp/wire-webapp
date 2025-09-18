/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {useCallback, useEffect, useRef} from 'react';

import {TYPING_TIMEOUT} from '../TypingIndicator';

type TypingIndicatorProps = {
  text: string;
  isEnabled: boolean;
  onTypingChange: (isTyping: boolean) => void;
};

export function useTypingIndicator({text, isEnabled, onTypingChange}: TypingIndicatorProps) {
  const hasHitKeyboard = useRef(false);
  const isTypingRef = useRef(false);

  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (isTyping !== isTypingRef.current) {
        isTypingRef.current = isTyping;
        onTypingChange(isTyping);
      }
    },
    [onTypingChange],
  );

  useEffect(() => {
    if (!hasHitKeyboard.current && isEnabled) {
      // If the user hasn't typed yet, we register a callback that will set the flag to true when the user first type
      const setHasHitKeyboard = () => {
        hasHitKeyboard.current = true;
      };
      document.addEventListener('keydown', setHasHitKeyboard);
      return () => document.removeEventListener('keydown', setHasHitKeyboard);
    }

    return () => {};
  }, [onTypingChange, isEnabled]);

  useEffect(() => {
    let timerId: number;
    if (!hasHitKeyboard.current) {
      return () => {};
    }

    if (text.length > 0) {
      setTyping(true);
      timerId = window.setTimeout(() => setTyping(false), TYPING_TIMEOUT);
    } else {
      setTyping(false);
    }

    return () => window.clearTimeout(timerId);
  }, [text, setTyping]);

  useEffect(() => () => setTyping(false), [setTyping]);
}
