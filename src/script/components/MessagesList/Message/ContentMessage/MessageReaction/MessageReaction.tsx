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

import {FC} from 'react';

import {amplify} from 'amplify';

import {WebAppEvents} from '@wireapp/webapp-events';

import {Icon} from 'Components/Icon';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {ContextMenuEntry, showContextMenu} from 'src/script/ui/ContextMenu';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {KEY} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {setContextMenuPosition} from 'Util/util';

import {
  messageActionsGroup,
  messageBodyActions,
  messageActionsMenuButton,
  messageWithHeaderTop,
  messageActionsMenuButtonFirst,
  messageActionsMenuButtonLast,
} from './MessageReaction.styles';

import {useMessageFocusedTabIndex} from '../../util';

// import {useTypingIndicatorState} from './TypingIndicator.state';

export interface MessageReactionProps {
  isMsgWithHeader: boolean;
  message: ContentMessage;
  menuClass: string;
  contextMenu: {entries: ko.Subscribable<ContextMenuEntry[]>};
  isMessageFocused: boolean;
}

const MessageReaction: FC<MessageReactionProps> = ({
  isMsgWithHeader,
  message,
  menuClass,
  contextMenu,
  isMessageFocused,
}) => {
  const {entries: menuEntries} = useKoSubscribableChildren(contextMenu, ['entries']);
  const messageFocusedTabIndex = useMessageFocusedTabIndex(isMessageFocused);
  let mesageReactionTop;

  if (isMsgWithHeader) {
    mesageReactionTop = messageWithHeaderTop;
  }

  const handleContextKeyDown = (event: React.KeyboardEvent) => {
    if ([KEY.SPACE, KEY.ENTER].includes(event.key)) {
      const newEvent = setContextMenuPosition(event);
      showContextMenu(newEvent, menuEntries, 'message-options-menu');
    }
  };

  return (
    <div css={{...messageBodyActions, ...mesageReactionTop}} className={menuClass}>
      <div css={messageActionsGroup} role="group" aria-label="Message actions" data-qa="message-actions">
        <button
          css={{...messageActionsMenuButton, ...messageActionsMenuButtonFirst}}
          aria-label="React with white_check_mark"
          aria-pressed="false"
          data-qa="white_check_mark"
          type="button"
          tabIndex={messageFocusedTabIndex}
        >
          <span>{'\u{1F44D}'}</span>
        </button>
        <button
          css={messageActionsMenuButton}
          aria-label="React with eyes"
          aria-pressed="false"
          type="button"
          tabIndex={messageFocusedTabIndex}
        >
          <span>{'\u{2764}'}</span>
        </button>
        <button
          css={messageActionsMenuButton}
          aria-label="React with raised_hands"
          type="button"
          tabIndex={messageFocusedTabIndex}
        >
          <svg width="23" height="23" viewBox="0 0 23 23" fill="none">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M19.4908 9.20192C19.7806 10.0821 19.9375 11.0227 19.9375 12C19.9375 16.936 15.936 20.9375 11 20.9375C6.06396 20.9375 2.0625 16.936 2.0625 12C2.0625 7.06396 6.06396 3.0625 11 3.0625C11.9773 3.0625 12.9179 3.21935 13.7981 3.50925C13.8958 2.80497 14.1389 2.1472 14.4963 1.56728C13.3979 1.19934 12.2222 1 11 1C4.92487 1 0 5.92487 0 12C0 18.0751 4.92487 23 11 23C17.0751 23 22 18.0751 22 12C22 10.7778 21.8007 9.6021 21.4327 8.50372C20.8528 8.86105 20.195 9.10423 19.4908 9.20192ZM11 18.875C7.67393 18.875 4.89952 16.5131 4.26253 13.375H17.7375C17.1005 16.5131 14.3261 18.875 11 18.875ZM15.7764 14.75C12.0833 14.75 6.24584 14.7695 6.24584 14.7695C6.5442 15.2807 6.92214 15.7378 7.36161 16.125H14.6384C15.4473 15.4123 15.7764 14.75 15.7764 14.75ZM13.75 10.625C14.5094 10.625 15.125 10.0094 15.125 9.25C15.125 8.49061 14.5094 7.875 13.75 7.875C12.9906 7.875 12.375 8.49061 12.375 9.25C12.375 10.0094 12.9906 10.625 13.75 10.625ZM9.625 9.25C9.625 10.0094 9.00939 10.625 8.25 10.625C7.49061 10.625 6.875 10.0094 6.875 9.25C6.875 8.49061 7.49061 7.875 8.25 7.875C9.00939 7.875 9.625 8.49061 9.625 9.25Z"
              fill="#34373D"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M15.5835 3.64687V4.40312H18.2304V7.05H18.9866V4.40312H21.6335V3.64687H18.9866V1H18.2304V3.64687H15.5835Z"
              fill="#34373D"
              stroke="#34373D"
              strokeWidth="1.25"
            />
          </svg>
        </button>
        <button
          css={messageActionsMenuButton}
          aria-label="Find another reaction"
          type="button"
          tabIndex={messageFocusedTabIndex}
          data-remove-tab-index="true"
          onClick={() => amplify.publish(WebAppEvents.CONVERSATION.MESSAGE.REPLY, message)}
        >
          <Icon.Reply className="svg-icon" />
        </button>
        {menuEntries.length > 0 && (
          <button
            tabIndex={messageFocusedTabIndex}
            css={{...messageActionsMenuButton, ...messageActionsMenuButtonLast}}
            className="icon-more font-size-xs"
            aria-label={t('accessibility.conversationContextMenuOpenLabel')}
            onKeyDown={handleContextKeyDown}
            onClick={event => showContextMenu(event, menuEntries, 'message-options-menu')}
          ></button>
        )}
      </div>
    </div>
  );
};

export {MessageReaction};
