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

import {useState, useEffect, useRef, FC, RefObject} from 'react';

import EmojiPicker, {EmojiClickData} from 'emoji-picker-react';
import {createPortal} from 'react-dom';

import {useClickOutside} from 'src/script/hooks/useClickOutside';
import {isEscapeKey} from 'Util/KeyboardUtil';
import {getEmojiUrl} from 'Util/ReactionUtil';

interface EmojiPickerContainerProps {
  posX: number;
  posY: number;
  handleEscape: () => void;
  resetActionMenuStates: () => void;
  wrapperRef: RefObject<HTMLDivElement>;
  handleReactionClick: (emoji: string) => void;
}

const EmojiPickerContainer: FC<EmojiPickerContainerProps> = ({
  posX,
  posY,
  handleEscape,
  resetActionMenuStates,
  wrapperRef,
  handleReactionClick,
}) => {
  const emojiRef = useRef<HTMLDivElement>(null);
  useClickOutside(emojiRef, resetActionMenuStates, wrapperRef);
  const [style, setStyle] = useState<object>({
    left: 0,
    top: 0,
    opacity: 0,
    width: '0px',
    position: 'absolute',
  });

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
    handleReactionClick(emojiData.emoji);
  }
  return (
    <>
      {createPortal(
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions
        <div
          className="overlay"
          onKeyDown={event => {
            if (isEscapeKey(event)) {
              handleEscape();
            }
          }}
        >
          <div
            ref={emojiRef}
            style={{maxHeight: window.innerHeight, ...style}}
            role="dialog"
            data-uie-name="emoji-picker-dialog"
          >
            <EmojiPicker onEmojiClick={onEmojiClick} getEmojiUrl={getEmojiUrl} />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};

export {EmojiPickerContainer};
