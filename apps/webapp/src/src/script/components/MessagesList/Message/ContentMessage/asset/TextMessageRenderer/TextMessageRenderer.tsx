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

import {useEffect, FC, useState, HTMLProps, useRef} from 'react';

import {isKeyDownEvent} from 'src/script/guards/Event';
import {isAuxClickEvent, isClickEvent} from 'src/script/guards/Mouse';
import {getAllFocusableElements, setElementsTabIndex} from 'Util/focusUtil';
import {handleKeyDown, KEY} from 'Util/KeyboardUtil';

import {ShowMoreButton} from './ShowMoreButton';

export type ElementType = 'markdownLink' | 'email' | 'mention';

interface TextMessageRendererProps extends HTMLProps<HTMLParagraphElement> {
  onMessageClick: (event: MouseEvent | KeyboardEvent, elementType: ElementType, messageDetails: MessageDetails) => void;
  text: string;
  isFocusable: boolean;
  /** will collapse the text to a single line when set (and add a `showMore` button if there is more content to show) */
  collapse?: boolean;
  setCanShowMore?: (showMore: boolean) => void;
}
export interface MessageDetails {
  href?: string;
  userId?: string;
  userDomain?: string;
}

const TextMessage: FC<TextMessageRendererProps> = ({
  text,
  onMessageClick,
  isFocusable,
  className,
  collapse = false,
  ...props
}) => {
  const containerRef = useRef<HTMLParagraphElement | null>(null);
  const [canShowMore, setCanShowMore] = useState<boolean>(false);
  const [showFullText, setShowFullText] = useState<boolean>(!collapse);

  const collapsedHeightRef = useRef<number>(0);

  useEffect(() => {
    const element = containerRef.current;

    if (element && collapse) {
      const preNode = element.querySelector('pre');
      const collapsedHeight = collapsedHeightRef.current || element.clientHeight;
      const width = Math.max(element.scrollWidth, preNode ? preNode.scrollWidth : 0);
      const height = Math.max(element.scrollHeight, preNode ? preNode.scrollHeight : 0);
      const isWider = width > element.clientWidth;
      const isHigher = height > collapsedHeight;
      collapsedHeightRef.current = collapsedHeight;
      setCanShowMore?.(isWider || isHigher);
    }
  }, [collapse, setCanShowMore]);

  useEffect(() => {
    const element = containerRef.current;

    if (!element) {
      return;
    }

    const interactiveMsgElements = getAllFocusableElements(element);
    setElementsTabIndex(interactiveMsgElements, isFocusable);
  }, [isFocusable]);

  const forwardEvent = (
    event: KeyboardEvent | MouseEvent,
    elementType: ElementType,
    messageDetails: MessageDetails,
  ) => {
    if (isKeyDownEvent(event) && isFocusable) {
      handleKeyDown({
        event,
        callback: () => {
          event.preventDefault();
          onMessageClick(event, elementType, messageDetails);
        },
        keys: [KEY.ENTER, KEY.SPACE],
      });
    } else if (isClickEvent(event) || isAuxClickEvent(event)) {
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
    const emailElement = target.closest('[data-email-link]');
    const markdownLinkElement = target.closest('[data-md-link]');
    const mentionElement = target.closest('.message-mention');

    if (markdownLinkElement) {
      const href = (markdownLinkElement as HTMLAnchorElement).href;
      const markdownLinkDetails = {
        href: href,
      };
      forwardEvent(event.nativeEvent, 'markdownLink', markdownLinkDetails);
    } else if (emailElement) {
      const href = (emailElement as HTMLAnchorElement).href;
      const markdownLinkDetails = {
        href: href,
      };
      forwardEvent(event.nativeEvent, 'email', markdownLinkDetails);
    } else if (mentionElement) {
      const mentionMsgDetails = {
        userId: target.dataset.userId,
        userDomain: target.dataset.userDomain,
      };
      forwardEvent(event.nativeEvent, 'mention', mentionMsgDetails);
    }
  };

  const extraClasses = showFullText ? 'message-quote__text--full' : '';

  const toggleShowMore = () => setShowFullText(prev => !prev);

  return (
    <>
      {
        // We will register the click event on the paragraph element and determine the type of the element clicked. //
        //This is because the paragraph element is fed with raw HTML and we cannot register the click event on the
        //clickabled elements directly.
      }
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <p
        ref={containerRef}
        onClick={handleInteraction}
        onAuxClick={handleInteraction}
        onKeyDown={handleInteraction}
        onKeyUp={handleInteraction}
        dangerouslySetInnerHTML={{__html: text}}
        dir="auto"
        className={`${className} ${extraClasses}`}
        {...props}
      />
      {canShowMore && (
        <ShowMoreButton onClick={toggleShowMore} isFocusable={isFocusable} active={showFullText}></ShowMoreButton>
      )}
    </>
  );
};

export const TextMessageRenderer = (props: TextMessageRendererProps) => {
  // We want to make sure that this element is re-rendered when the text changes (this will trigger useEffects' calculations to run).
  return <TextMessage key={props.text} {...props} />;
};
