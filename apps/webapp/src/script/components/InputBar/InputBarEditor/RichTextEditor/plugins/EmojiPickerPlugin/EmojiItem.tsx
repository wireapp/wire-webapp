/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {forwardRef, ForwardRefRenderFunction} from 'react';

import cx from 'classnames';

import {itemStyle, symbolStyle, nameStyle} from './EmojiItem.styles';

import {EmojiOption} from '../EmojiPickerPlugin/EmojiPickerPlugin';

interface EmojiItemProps {
  emoji: EmojiOption;
  onClick: () => void;
  onMouseEnter: () => void;
  selectedEmoji?: boolean;
}

const EmojiItemComponent: ForwardRefRenderFunction<HTMLButtonElement, EmojiItemProps> = (
  {emoji, onClick, onMouseEnter, selectedEmoji = false},
  ref,
) => (
  <button
    type="button"
    className={cx('button-reset-default', 'emoji', {selected: selectedEmoji})}
    css={itemStyle}
    onMouseEnter={onMouseEnter}
    onClick={onClick}
    aria-label={emoji.title}
    ref={ref}
  >
    <span css={symbolStyle}>{emoji.emoji}</span>
    <span css={nameStyle}>{emoji.title}</span>
  </button>
);

const EmojiItem = forwardRef(EmojiItemComponent);

export {EmojiItem};
