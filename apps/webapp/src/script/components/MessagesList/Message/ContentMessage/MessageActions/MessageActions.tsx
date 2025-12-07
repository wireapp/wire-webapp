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

import {FC, useCallback, useRef, useState} from 'react';

import {amplify} from 'amplify';
import {useClickOutside} from 'Hooks/useClickOutside';
import ko from 'knockout';
import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {ContextMenuEntry, showContextMenu} from 'src/script/ui/ContextMenu';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {isSpaceOrEnterKey, isTabKey} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {setContextMenuPosition} from 'Util/util';

import {WebAppEvents} from '@wireapp/webapp-events';

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
  handleReactionClick: (emoji: string) => void;
  reactionsTotalCount: number;
  isRemovedFromConversation: boolean;
}

const MessageActionsMenu: FC<MessageActionsMenuProps> = ({
  isMsgWithHeader,
  contextMenu,
  isMessageFocused,
  handleActionMenuVisibility,
  message,
  handleReactionClick,
  reactionsTotalCount,
  isRemovedFromConversation,
}) => {
  const {entries: menuEntries} = useKoSubscribableChildren(contextMenu, ['entries']);
  const messageFocusedTabIndex = useMessageFocusedTabIndex(isMessageFocused);
  const [currentMsgActionName, setCurrentMsgAction] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const messageReactionTop = isMsgWithHeader ? messageWithHeaderTop : null;
  const {handleMenuOpen, isMenuOpen} = useMessageActionsState();

  const resetActionMenuStates = useCallback(() => {
    setCurrentMsgAction('');
    handleMenuOpen(false);
    handleActionMenuVisibility(false);
  }, [handleActionMenuVisibility, handleMenuOpen]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (isTabKey(event)) {
      setCurrentMsgAction('');
    }
  }, []);

  const handleContextKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      const selectedMsgActionName = event.currentTarget.dataset.uieName;
      if (isSpaceOrEnterKey(event.key)) {
        if (selectedMsgActionName) {
          setCurrentMsgAction(selectedMsgActionName);
          handleMenuOpen(true);
          const newEvent = setContextMenuPosition(event);
          showContextMenu({event: newEvent, entries: menuEntries, identifier: 'message-options-menu'});
        }
      } else if (!event.shiftKey && isTabKey(event) && !reactionsTotalCount) {
        // if there's no reaction then on tab from context menu hide the message actions menu
        setCurrentMsgAction('');
        handleActionMenuVisibility(false);
        handleMenuOpen(false);
      } else if (isTabKey(event)) {
        // shift+tab/tab will remove the focus from the menu button
        setCurrentMsgAction('');
      }
    },
    [handleActionMenuVisibility, menuEntries, reactionsTotalCount],
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
        showContextMenu({
          event,
          entries: menuEntries,
          identifier: 'message-options-menu',
          resetMenuStates: resetActionMenuStates,
        });
      }
    },
    [currentMsgActionName, handleMenuOpen, menuEntries],
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

  const isMsgReactable = message.isReactable() && !isRemovedFromConversation;
  // clicking anywhere else other than the message action menu removes action menu active state
  useClickOutside(wrapperRef, () => {
    if (!isMenuOpen) {
      setCurrentMsgAction('');
    }
  });
  return (
    <div css={{...messageBodyActions, ...messageReactionTop}} ref={wrapperRef}>
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
              handleReactionClick={handleReactionClick}
            />
            {message.isReplyable() && (
              <ReplyButton
                actionId={MessageActionsId.REPLY}
                currentMsgActionName={currentMsgActionName}
                messageFocusedTabIndex={messageFocusedTabIndex}
                onReplyClick={handleMessageReply}
                onKeyPress={handleKeyDown}
              />
            )}
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
