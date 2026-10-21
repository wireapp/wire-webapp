/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {MouseEvent, useRef, useState, type RefObject} from 'react';

import {useClickOutside} from 'Hooks/useClickOutside';

interface EmojiPickerParams {
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  onEmojiPicked: (emoji: string) => void;
}

const TRIGGER_WIDTH = 40;
const TRIGGER_HEIGHT = 32;
const Y_OFFSET = 8;

type UseEmojiPickerResult = {
  open: boolean;
  position: {x: number; y: number};
  handleToggle: (event: MouseEvent<HTMLButtonElement>) => void;
  handleClose: () => void;
  handlePick: (emoji: string) => void;
  ref: RefObject<HTMLDivElement | null>;
};
export const useEmojiPicker = ({wrapperRef, onEmojiPicked}: EmojiPickerParams): UseEmojiPickerResult => {
  const [open, setOpen] = useState(false);

  const emojiWrapperRef = useRef<HTMLDivElement>(null);

  const emojiPickerPosition = useRef<{x: number; y: number}>({x: 0, y: 0});

  const handleClose = (): void => {
    if (open) {
      setOpen(false);
    }
  };

  const handleToggle = (event: MouseEvent<HTMLButtonElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect();

    emojiPickerPosition.current = {x: rect.x + TRIGGER_WIDTH, y: rect.y - TRIGGER_HEIGHT - Y_OFFSET};
    setOpen(prev => {
      return !prev;
    });
  };

  useClickOutside(wrapperRef, handleClose);

  return {
    open,
    position: emojiPickerPosition.current,
    handleToggle,
    handleClose,
    handlePick: onEmojiPicked,
    ref: emojiWrapperRef,
  };
};
