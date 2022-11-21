/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {useEffect, useRef, FC} from 'react';

import {Text} from 'src/script/entity/message/Text';
import {handleKeyDown} from 'Util/KeyboardUtil';
import {useDisposableRef} from 'Util/useDisposableRef';

export type ElementType = 'markdownLink' | 'email' | 'mention';

interface TextMessageRendererProps {
  onMessageClick: (asset: Text, event: MouseEvent | KeyboardEvent, elementType: ElementType) => void;
  text: string;
  isCurrentConversationFocused: boolean;
  msgClass: string;
  asset: Text;
  isQuoteMsg?: boolean;
  editedTimestamp?: number;
  setCanShowMore?: (showMore: boolean) => void;
}
const events = ['click', 'keydown', 'auxclick'];

export const TextMessageRenderer: FC<TextMessageRendererProps> = ({
  text,
  onMessageClick,
  msgClass,
  isCurrentConversationFocused,
  asset,
  isQuoteMsg = false,
  editedTimestamp,
  setCanShowMore,
  ...props
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const detectLongQuotes = useDisposableRef(
    element => {
      const preNode = element.querySelector('pre');
      const width = Math.max(element.scrollWidth, preNode ? preNode.scrollWidth : 0);
      const height = Math.max(element.scrollHeight, preNode ? preNode.scrollHeight : 0);
      const isWider = width > element.clientWidth;
      const isHigher = height > element.clientHeight;
      setCanShowMore?.(isWider || isHigher);
      return () => {};
    },
    [editedTimestamp],
  );

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }
    const emailLinks = containerRef.current && [...containerRef.current.querySelectorAll('[data-email-link]')];
    const markdownLinkTargets = [...containerRef.current.querySelectorAll('[data-md-link]')];
    const hasMentions = asset && asset.mentions().length;
    const msgMention = hasMentions
      ? containerRef.current && [...containerRef.current.querySelectorAll('.message-mention')]
      : [];

    const handleKeyEvent = (event: KeyboardEvent, elementType: ElementType) => {
      if (isCurrentConversationFocused) {
        handleKeyDown(event, () => onMessageClick(asset, event, elementType));
      }
    };

    const handleMsgEvent = (event: Event) => {
      return event.type === 'keydown'
        ? handleKeyEvent(event as KeyboardEvent, 'mention')
        : onMessageClick(asset, event as MouseEvent, 'mention');
    };

    function addEventListener(elements: Element[], elementType: ElementType) {
      elements?.forEach(element => {
        events.forEach(eventName => {
          element.addEventListener(eventName, handleMsgEvent);
        });
      });
    }

    function removeEventListener(elements: Element[], elementType: ElementType) {
      elements?.forEach(element => {
        events.forEach(eventName => {
          element.removeEventListener(eventName, handleMsgEvent);
        });
      });
    }

    addEventListener(emailLinks, 'email');
    addEventListener(markdownLinkTargets, 'markdownLink');
    addEventListener(msgMention, 'mention');

    return () => {
      removeEventListener(emailLinks, 'email');
      removeEventListener(markdownLinkTargets, 'markdownLink');
      removeEventListener(msgMention, 'mention');
    };
  }, [onMessageClick, asset, isCurrentConversationFocused, containerRef]);

  return (
    <div
      ref={element => {
        if (isQuoteMsg) {
          containerRef.current = detectLongQuotes(element);
        } else {
          containerRef.current = element;
        }
      }}
      className={msgClass}
      dangerouslySetInnerHTML={{__html: text}}
      dir="auto"
      {...props}
    />
  );
};
