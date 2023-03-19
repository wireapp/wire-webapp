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

import {Icon} from 'Components/Icon';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {ContextMenuEntry, showContextMenu} from 'src/script/ui/ContextMenu';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {isTabKey, KEY} from 'Util/KeyboardUtil';
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
}

const MessageActionsMenu: FC<MessageActionsMenuProps> = ({
  isMsgWithHeader,
  contextMenu,
  isMessageFocused,
  handleActionMenuVisibility,
  message,
  messageWithSection,
  handleReactionClick,
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
  }, []);

  const handleContextKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if ([KEY.SPACE, KEY.ENTER].includes(event.key)) {
        const newEvent = setContextMenuPosition(event);
        showContextMenu(newEvent, menuEntries, 'message-options-menu', resetActionMenuStates);
      } else if (isTabKey(event)) {
        setCurrentMsgAction('');
        handleActionMenuVisibility(false);
      }
    },
    [handleActionMenuVisibility, menuEntries, resetActionMenuStates],
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

  const toggleActiveMessageAction = useCallback(
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

  return (
    <div css={{...messageBodyActions, ...mesageReactionTop}} ref={wrapperRef}>
      <div
        css={messageActionsGroup}
        role="group"
        aria-label={t('accessibility.messageActionsMenuLabel')}
        data-uie-name="message-actions"
      >
        <MessageReactions
          messageFocusedTabIndex={messageFocusedTabIndex}
          currentMsgActionName={currentMsgActionName}
          handleCurrentMsgAction={setCurrentMsgAction}
          toggleActiveMessageAction={toggleActiveMessageAction}
          handleKeyDown={handleKeyDown}
          resetActionMenuStates={resetActionMenuStates}
          wrapperRef={wrapperRef}
          message={message}
          handleReactionClick={handleReactionClick}
        />
        <button
          css={{
            ...messageActionsMenuButton,
            ...getIconCSS,
            ...getActionsMenuCSS(currentMsgActionName === MessageActionsId.REPLY),
          }}
          type="button"
          tabIndex={messageFocusedTabIndex}
          data-uie-name={MessageActionsId.REPLY}
          aria-label={t('conversationContextMenuReply')}
          onClick={event => {
            toggleActiveMessageAction(event);
            amplify.publish(WebAppEvents.CONVERSATION.MESSAGE.REPLY, message);
          }}
          onKeyDown={handleKeyDown}
        >
          <Icon.Reply className="svg-icon" />
        </button>
        {menuEntries.length > 0 && (
          <button
            tabIndex={messageFocusedTabIndex}
            css={{
              ...messageActionsMenuButton,
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
