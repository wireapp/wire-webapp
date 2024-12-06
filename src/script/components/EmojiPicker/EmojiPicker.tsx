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

import {useState, useEffect, useRef, RefObject} from 'react';

import EmojiPickerReact, {EmojiClickData, EmojiStyle, SkinTones} from 'emoji-picker-react';
import {createPortal} from 'react-dom';

import {useClickOutside} from 'src/script/hooks/useClickOutside';
import {isEnterKey, isEscapeKey} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

interface EmojiPickerProps {
  posX: number;
  posY: number;
  onKeyPress: () => void;
  resetActionMenuStates: () => void;
  wrapperRef: RefObject<HTMLDivElement>;
  handleReactionClick: (emoji: string) => void;
}

export const EmojiPicker = ({
  posX,
  posY,
  onKeyPress,
  resetActionMenuStates,
  wrapperRef,
  handleReactionClick,
}: EmojiPickerProps) => {
  const emojiRef = useRef<HTMLDivElement>(null);
  useClickOutside(emojiRef, resetActionMenuStates, wrapperRef);
  const [style, setStyle] = useState<object>({
    left: 0,
    top: 0,
    opacity: 0,
    width: '0px',
    position: 'absolute',
  });
  let isKeyboardEvent = false;

  useEffect(() => {
    const mainElement = emojiRef && emojiRef.current;
    function updateSize() {
      const emojiPickerWidth = 350;
      const reactionMenuOpenerButtonHeight = 40;
      const left = mainElement && posX - emojiPickerWidth;
      const top = Math.max(
        mainElement && window.innerHeight - posY < mainElement.clientHeight
          ? posY - mainElement.offsetHeight + reactionMenuOpenerButtonHeight
          : posY,
        0,
      );
      const style = {
        left,
        top,
        width: 'auto',
        opacity: 1,
        position: 'absolute',
      };
      setStyle(style);
    }
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, [posX, posY]);

  function onEmojiClick(emojiData: EmojiClickData, event: MouseEvent) {
    localStorage.setItem('activeSkinTone', emojiData.activeSkinTone);

    handleReactionClick(emojiData.emoji);

    if (isKeyboardEvent) {
      // keyboard event still retains emoji button focus
      onKeyPress();
    } else {
      // click event will close the picker and reset active states
      resetActionMenuStates();
    }
  }

  function getSkinTone() {
    const currentSkinTone = localStorage.getItem('activeSkinTone');
    const skinTone = currentSkinTone ? (currentSkinTone as SkinTones) : SkinTones.NEUTRAL;
    return skinTone;
  }
  return (
    <>
      {createPortal(
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions
        <div
          className="overlay"
          onKeyDown={event => {
            // prevent emoji picker up/down arrow key to naviage between messages in background
            event.stopPropagation();
            if (isEscapeKey(event)) {
              onKeyPress();
            }
            if (isEnterKey(event)) {
              isKeyboardEvent = true;
            }
          }}
        >
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
          <div
            ref={emojiRef}
            style={{maxHeight: window.innerHeight, ...style}}
            role="dialog"
            data-uie-name="emoji-picker-dialog"
            // stop propagation to prevent emoji picker search input from losing focus
            // due to message element's handleFocus
            onClick={event => {
              event.stopPropagation();
            }}
          >
            <EmojiPickerReact
              emojiStyle={EmojiStyle.NATIVE}
              onEmojiClick={onEmojiClick}
              searchPlaceHolder={t('accessibility.emojiPickerSearchPlaceholder')}
              defaultSkinTone={getSkinTone()}
            />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};
