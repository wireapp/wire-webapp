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

import {MouseEvent, useRef, useState} from 'react';

import {useClickOutside} from 'Hooks/useClickOutside';

interface EmojiPickerParams {
  wrapperRef: React.RefObject<HTMLDivElement>;
  onEmojiPicked: (emoji: string) => void;
}

const TRIGGER_WIDTH = 40;
const TRIGGER_HEIGHT = 32;
const Y_OFFSET = 8;

export const useEmojiPicker = ({wrapperRef, onEmojiPicked}: EmojiPickerParams) => {
  const [open, setOpen] = useState(false);

  const emojiWrapperRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line id-length
  const emojiPickerPosition = useRef<{x: number; y: number}>({x: 0, y: 0});

  const handleClose = () => {
    if (open) {
      setOpen(false);
    }
  };

  const handleToggle = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    // eslint-disable-next-line id-length
    emojiPickerPosition.current = {x: rect.x + TRIGGER_WIDTH, y: rect.y - TRIGGER_HEIGHT - Y_OFFSET};
    setOpen(prev => !prev);
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
