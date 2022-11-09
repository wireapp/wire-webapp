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

import {FC} from 'react';

import cx from 'classnames';

import {itemStyle, symbolStyle, nameStyle} from './EmojiItem.styles';
import {EmojiListItem} from './useEmoji';

interface EmojiItemProps {
  emoji: EmojiListItem;
  onClick: () => void;
  onMouseEnter: () => void;
  selectedEmoji?: boolean;
}

const EmojiItem: FC<EmojiItemProps> = ({emoji, onClick, onMouseEnter, selectedEmoji = false}) => (
  <button
    type="button"
    className={cx('button-reset-default', 'emoji', {selected: selectedEmoji})}
    css={itemStyle}
    onMouseEnter={onMouseEnter}
    onClick={onClick}
    aria-label={emoji.name}
  >
    <span css={symbolStyle}>{emoji.icon}</span>
    <span css={nameStyle}>{emoji.name}</span>
  </button>
);

export {EmojiItem};
