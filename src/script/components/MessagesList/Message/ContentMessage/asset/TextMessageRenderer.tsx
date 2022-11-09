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

import {useEffect, useRef} from 'react';

import {Text} from 'src/script/entity/message/Text';
import {handleKeyDown} from 'Util/KeyboardUtil';
import {useDisposableRef} from 'Util/useDisposableRef';

export type ElementType = 'link' | 'email' | 'mention';

interface TextMessageRendererProps {
  onClickMsg: (event: MouseEvent | KeyboardEvent, asset: Text, elementType: ElementType) => void;
  text: string;
  isCurrentConversationFocused: boolean;
  msgClass: string;
  asset: Text;
  isQuoteMsg?: boolean;
  edited_timestamp?: number;
  setCanShowMore?: (showMore: boolean) => void;
}
const events = ['click', 'keydown', 'auxclick'];

export const TextMessageRenderer: React.FC<TextMessageRendererProps> = ({
  text,
  onClickMsg,
  msgClass,
  isCurrentConversationFocused,
  asset,
  isQuoteMsg = false,
  edited_timestamp,
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
    [edited_timestamp],
  );

  useEffect(() => {
    const emailLinks = containerRef.current && [...containerRef.current.querySelectorAll('[data-email-link]')];
    const linkTarget = containerRef.current && [...containerRef.current.querySelectorAll('a')];
    const msgLinkTarget = containerRef.current && [...containerRef.current.querySelectorAll('[data-uie-name]')];
    const hasMentions = asset && asset.mentions().length;
    const msgMention = hasMentions
      ? containerRef.current && [...containerRef.current.querySelectorAll('.message-mention')]
      : null;

    // set tabindex for each interactive element based on the element focus state
    if (msgMention) {
      msgMention?.forEach(mention => {
        mention.setAttribute('tabindex', isCurrentConversationFocused ? '0' : '-1');
      });
    }

    if (linkTarget) {
      linkTarget?.forEach(link => {
        link.setAttribute('tabindex', isCurrentConversationFocused ? '0' : '-1');
      });
    }

    if (msgLinkTarget) {
      msgLinkTarget?.forEach(link => {
        link.setAttribute('tabindex', isCurrentConversationFocused ? '0' : '-1');
      });
    }

    if (emailLinks) {
      emailLinks?.forEach(emailLink => {
        emailLink.setAttribute('tabindex', isCurrentConversationFocused ? '0' : '-1');
      });
    }

    const handleKeyEvent = (event: KeyboardEvent, elementType: ElementType) => {
      if (isCurrentConversationFocused) {
        handleKeyDown(event, () => onClickMsg(event, asset, elementType));
      }
    };

    if (containerRef.current) {
      emailLinks?.forEach(emailLink => {
        events.forEach(eventName => {
          emailLink.addEventListener(eventName, event => {
            if (eventName === 'keydown') {
              handleKeyEvent(event as KeyboardEvent, 'email');
              return;
            }
            onClickMsg(event as MouseEvent, asset, 'email');
          });
        });
      });

      linkTarget?.forEach(msgLink => {
        events.forEach(eventName => {
          msgLink.addEventListener(eventName, event => {
            if (eventName === 'keydown') {
              handleKeyEvent(event as KeyboardEvent, 'link');
              return;
            }
            onClickMsg(event as MouseEvent, asset, 'link');
          });
        });
      });

      msgMention?.forEach(mention => {
        events.forEach(eventName => {
          mention.addEventListener(eventName, event => {
            if (eventName === 'keydown') {
              handleKeyEvent(event as KeyboardEvent, 'mention');
              return;
            }
            onClickMsg(event as MouseEvent, asset, 'mention');
          });
        });
      });
    }
    return () => {
      emailLinks?.forEach(emailLink => {
        events.forEach(eventName => {
          emailLink.removeEventListener(eventName, event => {
            onClickMsg(event as MouseEvent, asset, 'email');
          });
        });
      });

      linkTarget?.forEach(msgLink => {
        events.forEach(eventName => {
          msgLink.removeEventListener(eventName, event => {
            onClickMsg(event as MouseEvent, asset, 'link');
          });
        });
      });

      msgMention?.forEach(mention => {
        events.forEach(eventName => {
          mention.removeEventListener(eventName, event => {
            onClickMsg(event as MouseEvent, asset, 'mention');
          });
        });
      });
    };
  }, [onClickMsg, asset, isCurrentConversationFocused, containerRef]);

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
