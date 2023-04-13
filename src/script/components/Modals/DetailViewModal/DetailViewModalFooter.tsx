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

import {QualifiedId} from '@wireapp/api-client/lib/user';
import {ReactionType} from '@wireapp/core/lib/conversation';
import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';

import {MessageActionsId} from 'Components/MessagesList/Message/ContentMessage/MessageActions/MessageActions';
import {useMessageActionsState} from 'Components/MessagesList/Message/ContentMessage/MessageActions/MessageActions.state';
import {
  getActionsMenuCSS,
  getIconCSS,
  messageActionsMenuButton,
} from 'Components/MessagesList/Message/ContentMessage/MessageActions/MessageActions.styles';
import {MessageReactions} from 'Components/MessagesList/Message/ContentMessage/MessageActions/MessageReactions/MessageReactions';
import {ReplyButton} from 'Components/MessagesList/Message/ContentMessage/MessageActions/ReplyButton';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {isTabKey} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import {MessageRepository} from '../../../conversation/MessageRepository';
import {Conversation} from '../../../entity/Conversation';
import {ContentMessage} from '../../../entity/message/ContentMessage';

interface DetailViewModalFooterProps {
  messageEntity: ContentMessage;
  conversationEntity: Conversation;
  onReplyClick: (conversation: Conversation, message: ContentMessage) => void;
  onDownloadClick: (message: ContentMessage) => void;
  messageRepository: MessageRepository;
  selfId: QualifiedId;
}

const MESSAGE_REPLY_ID = 'do-reply-fullscreen-picture';
const MESSAGE_DOWNLOAD_ID = 'do-download-fullscreen-picture';

const DetailViewModalFooter: FC<DetailViewModalFooterProps> = ({
  messageEntity,
  conversationEntity,
  onReplyClick,
  onDownloadClick,
  messageRepository,
  selfId,
}) => {
  const {removed_from_conversation: isRemovedFromConversation} = useKoSubscribableChildren(conversationEntity, [
    'removed_from_conversation',
  ]);
  const [currentMsgActionName, setCurrentMsgAction] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const handleReactionClick = (reaction: ReactionType): void => {
    if (!messageEntity.isContent()) {
      return;
    }
    return void messageRepository.toggleReaction(conversationEntity, messageEntity, reaction, selfId.id);
  };
  const {handleMenuOpen} = useMessageActionsState();
  const resetActionMenuStates = useCallback(() => {
    setCurrentMsgAction('');
    handleMenuOpen(false);
  }, [handleMenuOpen]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (isTabKey(event)) {
      setCurrentMsgAction('');
    }
  }, []);

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
      onReplyClick(conversationEntity, messageEntity);
    },
    [conversationEntity, messageEntity, onReplyClick, toggleActiveMenu],
  );

  return (
    <footer className="detail-view-footer">
      {messageEntity.isReactable() && !isRemovedFromConversation && (
        <div ref={wrapperRef} style={{display: 'flex'}}>
          <MessageReactions
            messageFocusedTabIndex={TabIndex.FOCUSABLE}
            currentMsgActionName={currentMsgActionName}
            handleCurrentMsgAction={setCurrentMsgAction}
            resetActionMenuStates={resetActionMenuStates}
            wrapperRef={wrapperRef}
            message={messageEntity}
            handleReactionClick={handleReactionClick}
            toggleActiveMenu={toggleActiveMenu}
            handleKeyDown={handleKeyDown}
          />
          {messageEntity.isReplyable() && !isRemovedFromConversation && (
            <ReplyButton
              actionId={MESSAGE_REPLY_ID}
              currentMsgActionName={currentMsgActionName}
              messageFocusedTabIndex={TabIndex.FOCUSABLE}
              onReplyClick={handleMessageReply}
              onKeyPress={handleKeyDown}
            />
          )}
          {messageEntity.isDownloadable() && (
            <button
              css={{
                ...messageActionsMenuButton,
                ...getIconCSS,
                ...getActionsMenuCSS(currentMsgActionName === MessageActionsId.REPLY),
              }}
              type="button"
              tabIndex={TabIndex.FOCUSABLE}
              data-uie-name={MESSAGE_DOWNLOAD_ID}
              aria-label={t('conversationContextMenuDownload')}
              onClick={() => onDownloadClick(messageEntity)}
            >
              <span className="icon-download" />
            </button>
          )}
        </div>
      )}
    </footer>
  );
};

export {DetailViewModalFooter};
