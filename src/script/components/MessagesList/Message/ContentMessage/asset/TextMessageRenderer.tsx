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
    const linkTargets = containerRef.current && [...containerRef.current.querySelectorAll('a[data-md-link]')];
    const msgLinkTargets = containerRef.current && [...containerRef.current.querySelectorAll('[data-uie-name]')];
    const hasMentions = asset && asset.mentions().length;
    const msgMention = hasMentions
      ? containerRef.current && [...containerRef.current.querySelectorAll('.message-mention')]
      : null;

    // set tabindex for each interactive element based on the element focus state
    if (msgMention) {
      msgMention.forEach(mention => {
        mention.setAttribute('tabindex', isCurrentConversationFocused ? '0' : '-1');
      });
    }

    if (linkTargets.length) {
      linkTargets.forEach(link => {
        link.setAttribute('tabindex', isCurrentConversationFocused ? '0' : '-1');
      });
    }

    if (msgLinkTargets.length) {
      msgLinkTargets.forEach(link => {
        link.setAttribute('tabindex', isCurrentConversationFocused ? '0' : '-1');
      });
    }

    if (emailLinks.length) {
      emailLinks?.forEach(emailLink => {
        emailLink.setAttribute('tabindex', isCurrentConversationFocused ? '0' : '-1');
      });
    }

    const handleKeyEvent = (event: KeyboardEvent, elementType: ElementType) => {
      if (isCurrentConversationFocused) {
        handleKeyDown(event, () => onMessageClick(asset, event, elementType));
      }
    };

    const handleClickEmail = (event: Event) => {
      return event.type === 'keydown'
        ? handleKeyEvent(event as KeyboardEvent, 'email')
        : onMessageClick(asset, event as MouseEvent, 'email');
    };
    emailLinks?.forEach(emailLink => {
      events.forEach(eventName => {
        emailLink.addEventListener(eventName, handleClickEmail);
      });
    });

    const handleClickLink = (event: Event) => {
      return event.type === 'keydown'
        ? handleKeyEvent(event as KeyboardEvent, 'markdownLink')
        : onMessageClick(asset, event as MouseEvent, 'markdownLink');
    };

    linkTargets?.forEach(msgLink => {
      events.forEach(eventName => {
        msgLink.addEventListener(eventName, handleClickLink);
      });
    });

    const handleClickMention = (event: Event) => {
      return event.type === 'keydown'
        ? handleKeyEvent(event as KeyboardEvent, 'mention')
        : onMessageClick(asset, event as MouseEvent, 'mention');
    };

    msgMention?.forEach(mention => {
      events.forEach(eventName => {
        mention.addEventListener(eventName, handleClickMention);
      });
    });

    return () => {
      emailLinks?.forEach(emailLink => {
        events.forEach(eventName => {
          emailLink.removeEventListener(eventName, handleClickEmail);
        });
      });

      linkTargets?.forEach(msgLink => {
        events.forEach(eventName => {
          msgLink.removeEventListener(eventName, handleClickLink);
        });
      });

      msgMention?.forEach(mention => {
        events.forEach(eventName => {
          mention.removeEventListener(eventName, handleClickMention);
        });
      });
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
