/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import React, {useState} from 'react';

import {CallingRepository} from 'src/script/calling/CallingRepository';
import {t} from 'Util/LocalizerUtil';

import {emojisBarButtonStyles, emojisBarWrapperStyles} from './EmojisBar.styles';

const EMOJIS_LIST = ['👍', '🎉', '❤️', '😂', '😮', '👏', '🤔', '😢', '👎'];

export interface EmojisBarProps {
  onEmojiClick: (emoji: string) => void;
  ref: React.RefObject<HTMLDivElement>;
}

export const EmojisBar = ({onEmojiClick, ref}: EmojisBarProps) => {
  const [disabledEmojis, setDisabledEmojis] = useState<string[]>([]);

  const handleEmojiClick = (selectedEmoji: string) => {
    setDisabledEmojis(prev => [...prev, selectedEmoji]);

    onEmojiClick(selectedEmoji);

    setTimeout(() => {
      setDisabledEmojis(prev => [...prev].filter(emoji => emoji !== selectedEmoji));
    }, CallingRepository.EMOJI_TIME_OUT_DURATION);
  };

  return (
    <div
      ref={ref}
      role="toolbar"
      data-uie-name="video-controls-emojis-bar"
      aria-label={t('callReactionButtonsAriaLabel')}
      css={emojisBarWrapperStyles}
    >
      {EMOJIS_LIST.map(emoji => {
        const isDisabled = disabledEmojis.includes(emoji);
        return (
          <button
            aria-label={t('callReactionButtonAriaLabel', {emoji})}
            data-uie-name="video-controls-emoji"
            data-uie-value={emoji}
            key={emoji}
            disabled={isDisabled}
            onClick={() => handleEmojiClick(emoji)}
            css={emojisBarButtonStyles}
          >
            {emoji}
          </button>
        );
      })}
    </div>
  );
};
