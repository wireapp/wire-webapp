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

import {useEffect, FC, useState} from 'react';

import {Text} from 'src/script/entity/message/Text';
import {isKeyDownEvent} from 'src/script/guards/Event';
import {isMouseEvent} from 'src/script/guards/Mouse';
import {getAllFocusableElements, setElementsTabIndex} from 'Util/focusUtil';
import {handleKeyDown} from 'Util/KeyboardUtil';

export type ElementType = 'markdownLink' | 'email' | 'mention';

interface TextMessageRendererProps {
  onMessageClick: (event: MouseEvent | KeyboardEvent, elementType: ElementType, messageDetails: MessageDetails) => void;
  text: string;
  isCurrentConversationFocused: boolean;
  msgClass: string;
  asset: Text;
  isQuoteMsg?: boolean;
  editedTimestamp?: number;
  setCanShowMore?: (showMore: boolean) => void;
}
export interface MessageDetails {
  href?: string;
  userId?: string;
  userDomain?: string;
}

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
  const [containerRef, setContainerRef] = useState<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const element = containerRef;

    if (element && isQuoteMsg) {
      const preNode = element.querySelector('pre');
      const width = Math.max(element.scrollWidth, preNode ? preNode.scrollWidth : 0);
      const height = Math.max(element.scrollHeight, preNode ? preNode.scrollHeight : 0);
      const isWider = width > element.clientWidth;
      const isHigher = height > element.clientHeight;
      setCanShowMore?.(isWider || isHigher);
    }
  }, [isQuoteMsg, setCanShowMore, containerRef]);

  useEffect(() => {
    if (!containerRef) {
      return;
    }

    const interactiveMsgElements = getAllFocusableElements(containerRef);
    setElementsTabIndex(interactiveMsgElements, isCurrentConversationFocused);
  }, [isCurrentConversationFocused, containerRef]);

  const forwardEvent = (
    event: KeyboardEvent | MouseEvent,
    elementType: ElementType,
    messageDetails: MessageDetails,
  ) => {
    if (isKeyDownEvent(event) && isCurrentConversationFocused) {
      handleKeyDown(event, () => {
        event.preventDefault();
        onMessageClick(event, elementType, messageDetails);
      });
    } else if (isMouseEvent(event)) {
      event.preventDefault();
      onMessageClick(event, elementType, messageDetails);
    }
  };

  /**
   * Will handle interaction with the message.
   * Depending on the child element clicked, it will forward the event to the parent component.
   */
  const handleInteraction = (event: React.MouseEvent | React.KeyboardEvent) => {
    const target = event.target as HTMLElement;
    if (!target) {
      return;
    }
    const isEmail = target.closest('[data-email-link]');
    const isMarkdownLink = target.closest('[data-md-link]');
    const isMention = target.closest('.message-mention');

    if (isEmail || isMarkdownLink) {
      const href = (event.target as HTMLAnchorElement).href;
      const markdownLinkDetails = {
        href: href,
      };
      forwardEvent(event.nativeEvent, isEmail ? 'email' : 'markdownLink', markdownLinkDetails);
    } else if (isMention) {
      const mentionMsgDetails = {
        userId: target.dataset.userId,
        userDomain: target.dataset.userDomain,
      };
      forwardEvent(event.nativeEvent, 'mention', mentionMsgDetails);
    }
  };

  return (
    // We will register the click event on the paragraph element and determine the type of the element clicked.
    // This is because the paragraph element is fed with raw HTML and we cannot register the click event on the clickabled elements directly.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <p
      ref={setContainerRef}
      key={`${editedTimestamp}:${text}`}
      onClick={handleInteraction}
      onAuxClick={handleInteraction}
      onKeyDown={handleInteraction}
      onKeyUp={handleInteraction}
      className={msgClass}
      dangerouslySetInnerHTML={{__html: text}}
      dir="auto"
      {...props}
    />
  );
};
