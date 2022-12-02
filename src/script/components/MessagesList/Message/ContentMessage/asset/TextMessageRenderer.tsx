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
import {getAllFocusableElements, setElementsTabIndex} from 'Util/focusUtil';
import {handleKeyDown} from 'Util/KeyboardUtil';
import {useDisposableRef} from 'Util/useDisposableRef';

export type ElementType = 'markdownLink' | 'email' | 'mention';

interface TextMessageRendererProps {
  onMessageClick: (
    asset: Text,
    event: MouseEvent | KeyboardEvent,
    elementType: ElementType,
    messageDetails: MessageDetails,
  ) => void;
  text: string;
  isCurrentConversationFocused: boolean;
  msgClass: string;
  asset: Text;
  isQuoteMsg?: boolean;
  editedTimestamp?: number;
  setCanShowMore?: (showMore: boolean) => void;
}
const events = ['click', 'keydown', 'auxclick'];
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

    const interactiveMsgElements = getAllFocusableElements(containerRef.current);
    setElementsTabIndex(interactiveMsgElements, isCurrentConversationFocused);

    const emailLinks = [...containerRef.current.querySelectorAll('[data-email-link]')];
    const markdownLinkTargets = [...containerRef.current.querySelectorAll('[data-md-link]')];
    const hasMentions = asset && asset.mentions().length;
    const msgMentions = hasMentions ? [...containerRef.current.querySelectorAll('.message-mention')] : [];

    const handleKeyEvent = (event: KeyboardEvent, elementType: ElementType, messageDetails: MessageDetails) => {
      if (isCurrentConversationFocused) {
        handleKeyDown(event, () => onMessageClick(asset, event, elementType, messageDetails));
      }
    };

    const handleMsgEvent = (event: Event) => {
      const currentTarget = event.currentTarget as HTMLElement;
      const markdownLinkTarget = currentTarget?.dataset.mdLink;
      const emailLink = currentTarget?.dataset.emailLink;
      const msgMention = currentTarget?.dataset.userId;

      if (emailLink) {
        const href = (event.target as HTMLAnchorElement).href;
        const emailDetails = {
          href: href,
        };

        return event.type === 'keydown'
          ? handleKeyEvent(event as KeyboardEvent, 'email', emailDetails)
          : onMessageClick(asset, event as MouseEvent, 'email', emailDetails);
      } else if (markdownLinkTarget) {
        const href = (event.target as HTMLAnchorElement).href;
        const markdownLinkDetails = {
          href: href,
        };

        return event.type === 'keydown'
          ? handleKeyEvent(event as KeyboardEvent, 'markdownLink', markdownLinkDetails)
          : onMessageClick(asset, event as MouseEvent, 'markdownLink', markdownLinkDetails);
      } else if (msgMention) {
        const mentionMsgDetails = {
          userId: currentTarget?.dataset.userId,
          userDomain: currentTarget?.dataset.userDomain,
        };

        return event.type === 'keydown'
          ? handleKeyEvent(event as KeyboardEvent, 'mention', mentionMsgDetails)
          : onMessageClick(asset, event as MouseEvent, 'mention', mentionMsgDetails);
      }
    };

    function addEventListener(elements: Element[]) {
      elements?.forEach(element => {
        events.forEach(eventName => {
          element.addEventListener(eventName, handleMsgEvent);
        });
      });
    }

    function removeEventListener(elements: Element[]) {
      elements?.forEach(element => {
        events.forEach(eventName => {
          element.removeEventListener(eventName, handleMsgEvent);
        });
      });
    }

    addEventListener(emailLinks);
    addEventListener(markdownLinkTargets);
    addEventListener(msgMentions);

    return () => {
      removeEventListener(emailLinks);
      removeEventListener(markdownLinkTargets);
      removeEventListener(msgMentions);
    };
  }, [onMessageClick, asset, isCurrentConversationFocused]);

  return (
    <p
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
