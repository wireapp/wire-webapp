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

import {FC, useState, useCallback, useRef} from 'react';

import {amplify} from 'amplify';

import {WebAppEvents} from '@wireapp/webapp-events';

import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {ContextMenuEntry, showContextMenu} from 'src/script/ui/ContextMenu';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {isEscapeKey, isTabKey, KEY} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {setContextMenuPosition} from 'Util/util';

import {useMessageActionsState} from './MessageActions.state';
import {
  messageActionsGroup,
  messageBodyActions,
  messageActionsMenuButton,
  getActionsMenuCSS,
  getIconCSS,
  messageWithHeaderTop,
} from './MessageActions.styles';
import {MessageReactions} from './MessageReactions/MessageReactions';
import {ReplyButton} from './ReplyButton';

import {useMessageFocusedTabIndex} from '../../util';

export const MessageActionsId = {
  THUMBSUP: 'reactwith-thumbsup-messag',
  HEART: 'reactwith-love-message',
  EMOJI: 'reactwith-emoji-message',
  REPLY: 'do-reply-message',
  OPTIONS: 'go-options',
} as const;

export interface MessageActionsMenuProps {
  isMsgWithHeader: boolean;
  message: ContentMessage;
  contextMenu: {entries: ko.Subscribable<ContextMenuEntry[]>};
  isMessageFocused: boolean;
  handleActionMenuVisibility: (isVisible: boolean) => void;
  messageWithSection: boolean;
  handleReactionClick: (emoji: string) => void;
  reactionsTotalCount: number;
}

const MessageActionsMenu: FC<MessageActionsMenuProps> = ({
  isMsgWithHeader,
  contextMenu,
  isMessageFocused,
  handleActionMenuVisibility,
  message,
  messageWithSection,
  handleReactionClick,
  reactionsTotalCount,
}) => {
  const {entries: menuEntries} = useKoSubscribableChildren(contextMenu, ['entries']);
  const messageFocusedTabIndex = useMessageFocusedTabIndex(isMessageFocused);
  const [currentMsgActionName, setCurrentMsgAction] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mesageReactionTop = isMsgWithHeader && messageWithSection ? messageWithHeaderTop : null;
  const {handleMenuOpen} = useMessageActionsState();

  const resetActionMenuStates = useCallback(() => {
    setCurrentMsgAction('');
    handleMenuOpen(false);
    handleActionMenuVisibility(false);
  }, [handleActionMenuVisibility, handleMenuOpen]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (isTabKey(event)) {
      setCurrentMsgAction('');
    }
    // on escape from any of message actions menu item should close the reaction and focus on message input bar
    if (isEscapeKey(event)) {
      resetActionMenuStates();
    }
  }, []);

  const handleContextKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if ([KEY.SPACE, KEY.ENTER].includes(event.key)) {
        const newEvent = setContextMenuPosition(event);
        showContextMenu(newEvent, menuEntries, 'message-options-menu', resetActionMenuStates);
      } else if (!event.shiftKey && isTabKey(event) && !reactionsTotalCount) {
        // if there's no reaction then on tab from context menu should hide message actions menu
        setCurrentMsgAction('');
        handleActionMenuVisibility(false);
      } else if (isEscapeKey(event)) {
        resetActionMenuStates();
      }
    },
    [handleActionMenuVisibility, menuEntries, reactionsTotalCount, resetActionMenuStates],
  );

  const handleContextMenuClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const selectedMsgActionName = event.currentTarget.dataset.uieName;
      if (currentMsgActionName === selectedMsgActionName) {
        // reset on double click
        setCurrentMsgAction('');
        handleMenuOpen(false);
      } else if (selectedMsgActionName) {
        setCurrentMsgAction(selectedMsgActionName);
        handleMenuOpen(true);
        showContextMenu(event, menuEntries, 'message-options-menu', resetActionMenuStates);
      }
    },
    [resetActionMenuStates, currentMsgActionName, handleMenuOpen, menuEntries],
  );

  const toggleActiveMenu = useCallback(
    (event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>) => {
      const selectedMsgActionName = event.currentTarget.dataset.uieName;
      handleMenuOpen(false);
      if (currentMsgActionName === selectedMsgActionName) {
        // reset on double click
        setCurrentMsgAction('');
      } else if (selectedMsgActionName) {
        setCurrentMsgAction(selectedMsgActionName);
      }
    },
    [currentMsgActionName, handleMenuOpen],
  );

  const handleMessageReply = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      toggleActiveMenu(event);
      amplify.publish(WebAppEvents.CONVERSATION.MESSAGE.REPLY, message);
    },
    [message, toggleActiveMenu],
  );

  const isMsgReactable = message.isReactable();

  return (
    <div css={{...messageBodyActions, ...mesageReactionTop}} ref={wrapperRef}>
      <div
        css={messageActionsGroup}
        role="group"
        aria-label={t('accessibility.messageActionsMenuLabel')}
        data-uie-name="message-actions"
      >
        {isMsgReactable && (
          <>
            <MessageReactions
              messageFocusedTabIndex={messageFocusedTabIndex}
              currentMsgActionName={currentMsgActionName}
              handleCurrentMsgAction={setCurrentMsgAction}
              toggleActiveMenu={toggleActiveMenu}
              handleKeyDown={handleKeyDown}
              resetActionMenuStates={resetActionMenuStates}
              wrapperRef={wrapperRef}
              message={message}
              handleReactionClick={handleReactionClick}
            />
            <ReplyButton
              actionId={MessageActionsId.REPLY}
              currentMsgActionName={currentMsgActionName}
              messageFocusedTabIndex={messageFocusedTabIndex}
              onReplyClick={handleMessageReply}
              onKeyPress={handleKeyDown}
            />
          </>
        )}

        {menuEntries.length > 0 && (
          <button
            tabIndex={messageFocusedTabIndex}
            css={{
              ...messageActionsMenuButton(isMsgReactable),
              ...getIconCSS,
              ...getActionsMenuCSS(currentMsgActionName === MessageActionsId.OPTIONS),
            }}
            className="icon-more font-size-xs"
            data-uie-name={MessageActionsId.OPTIONS}
            aria-label={t('accessibility.conversationContextMenuOpenLabel')}
            onClick={event => {
              handleContextMenuClick(event);
            }}
            onKeyDown={event => {
              handleContextKeyDown(event);
            }}
          ></button>
        )}
      </div>
    </div>
  );
};

export {MessageActionsMenu};
