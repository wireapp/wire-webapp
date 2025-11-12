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

import {useEffect, useRef, useState} from 'react';

import EmojiPicker, {EmojiClickData, EmojiStyle} from 'emoji-picker-react';

import {CallingRepository} from 'Repositories/calling/CallingRepository';
import {t} from 'Util/LocalizerUtil';

import {styles} from './EmojisBar.styles';

interface EmojisBarProps {
  onEmojiClick: (emoji: string) => void;
  onPickerEmojiClick: () => void;
  targetWindow: Window;
}

const DEFAULT_EMOJI_LIST = ['👍', '🎉', '❤️', '😂', '😮', '👏', '🤔', '😢'];

type EmojiPickerLocalStorageItem = {unified: string; original: string; count: number}[];

const EMOJI_PICKER_LOCAL_STORAGE_KEY = 'epr_suggested';

export const EmojisBar = ({onEmojiClick, onPickerEmojiClick, targetWindow}: EmojisBarProps) => {
  const emojisBarRef = useRef<HTMLDivElement>(null);

  const [disabledEmojis, setDisabledEmojis] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleEmojiClick = (selectedEmoji: string) => {
    setDisabledEmojis(prev => [...prev, selectedEmoji]);

    onEmojiClick(selectedEmoji);

    setTimeout(() => {
      setDisabledEmojis(prev => prev.filter(emoji => emoji !== selectedEmoji));
    }, CallingRepository.EMOJI_TIME_OUT_DURATION);
  };

  const handlePickerEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiClick(emojiData.emoji);
    onPickerEmojiClick();
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (emojisBarRef.current && !emojisBarRef.current.contains(event.target as Node)) {
      onPickerEmojiClick();
    }
  };

  useEffect(() => {
    targetWindow.document.addEventListener('mousedown', handleClickOutside);
    return () => {
      targetWindow.document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [targetWindow, onPickerEmojiClick]);

  const recentEmojis: EmojiPickerLocalStorageItem = JSON.parse(
    localStorage.getItem(EMOJI_PICKER_LOCAL_STORAGE_KEY) ?? '[]',
  );

  const recentTopEmojis = recentEmojis
    .sort((emojiA, emojiB) => emojiB.count - emojiA.count)
    .map(emoji => String.fromCodePoint(parseInt(emoji.unified, 16)))
    .concat(DEFAULT_EMOJI_LIST)
    .slice(0, 8);

  return (
    <div ref={emojisBarRef}>
      {showEmojiPicker ? (
        <div
          role="dialog"
          data-uie-name="video-controls-emojis-picker"
          aria-label={t('callReactionEmojiPickerAriaLabel')}
          css={styles.picker}
        >
          <EmojiPicker emojiStyle={EmojiStyle.NATIVE} onEmojiClick={handlePickerEmojiClick} />
        </div>
      ) : (
        <div
          role="toolbar"
          data-uie-name="video-controls-emojis-bar"
          aria-label={t('callReactionButtonsAriaLabel')}
          css={styles.emojisBar}
        >
          {recentTopEmojis.map(emoji => {
            const isDisabled = disabledEmojis.includes(emoji);
            return (
              <button
                aria-label={t('callReactionButtonAriaLabel', {emoji})}
                data-uie-name="video-controls-emoji"
                data-uie-value={emoji}
                key={emoji}
                disabled={isDisabled}
                onClick={() => handleEmojiClick(emoji)}
                css={styles.button}
              >
                {emoji}
              </button>
            );
          })}
          <button
            aria-label={t('callReactionEmojiPickerButtonAriaLabel')}
            data-uie-name="call-reaction-emoji-picker-button"
            data-uie-value="open-emoji-picker"
            className="icon-more font-size-sm"
            onClick={event => {
              event.stopPropagation();
              setShowEmojiPicker(prev => !prev);
            }}
            css={styles.button}
          ></button>
        </div>
      )}
    </div>
  );
};
