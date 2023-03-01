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

import {useState, useEffect, forwardRef, RefObject, useRef} from 'react';

import EmojiPicker, {EmojiClickData} from 'emoji-picker-react';
import {createPortal} from 'react-dom';

import {isEscapeKey} from 'Util/KeyboardUtil';

interface EmojiPickerContainerProps {
  posX: number;
  posY: number;
  handleCurrentMsgAction: (actionName: string) => void;
  cleanUp: () => void;
}

const EmojiPickerContainer = forwardRef<RefObject<HTMLDivElement>, EmojiPickerContainerProps>(
  ({posX, posY, handleCurrentMsgAction, cleanUp}) => {
    const [selectedEmoji, setSelectedEmoji] = useState<string>('');
    const emojiRef = useRef<HTMLDivElement>(null);
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
        const left = mainElement && window.innerWidth - posX;
        const top = Math.max(
          mainElement && window.innerHeight - posY < mainElement.clientHeight ? posY - mainElement.offsetHeight : posY,
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

    function onClick(emojiData: EmojiClickData, event: MouseEvent) {
      setSelectedEmoji(emojiData.unified);
    }
    return (
      <>
        {createPortal(
          // eslint-disable-next-line jsx-a11y/no-static-element-interactions
          <div
            style={{
              height: '100vh',
              width: '100vw',
              position: 'relative',
              left: 0,
              right: 0,
              zIndex: 1000,
            }}
            onKeyDown={event => {
              if (isEscapeKey(event)) {
                cleanUp();
              }
            }}
          >
            <div ref={emojiRef} style={{maxHeight: window.innerHeight, ...style}}>
              <EmojiPicker onEmojiClick={onClick} />
            </div>
            <p>{selectedEmoji}</p>
          </div>,
          document.body,
        )}
      </>
    );
  },
);

EmojiPickerContainer.displayName = 'EmojiPickerContainer';
export {EmojiPickerContainer};
