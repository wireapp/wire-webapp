/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {MessagesList} from 'Components/MessagesList/MessageList';
import {MessagesListParams} from 'Components/MessagesList/MessageList.types';
import {ReactWindowVirtualization} from 'Components/MessagesList/ReactWindowVirtualization';

import {VirtualizedMessageListWrapper} from './VirtualizedMessageListWrapper';

import {Config} from '../../Config';

export const MessageListWrapper = ({
  assetRepository,
  conversation,
  selfUser,
  conversationRepository,
  messageRepository,
  getVisibleCallback,
  onClickMessage,
  showUserDetails,
  showMessageDetails,
  showMessageReactions,
  showImageDetails,
  showParticipants,
  cancelConnectionRequest,
  resetSession,
  invitePeople,
  contextMessageActions,
  onLoading,
  isMsgElementsFocusable,
  setMsgElementsFocusable,
  isRightSidebarOpen = false,
  isConversationLoaded,
  updateConversationLastRead,
}: MessagesListParams) => {
  const isVirtualizedMessagesListEnabled = Config.getConfig().FEATURE.ENABLE_VIRTUALIZED_MESSAGES_LIST;

  if (isVirtualizedMessagesListEnabled) {
    return (
      <ReactWindowVirtualization
        conversation={conversation}
        conversationRepository={conversationRepository}
        onLoading={onLoading}
        contextMessageActions={contextMessageActions}
        selfUser={selfUser}
        messageRepository={messageRepository}
        isMsgElementsFocusable={isMsgElementsFocusable}
        setMsgElementsFocusable={setMsgElementsFocusable}
        invitePeople={invitePeople}
        cancelConnectionRequest={cancelConnectionRequest}
        showUserDetails={showUserDetails}
        showMessageDetails={showMessageDetails}
        showMessageReactions={showMessageReactions}
        showParticipants={showParticipants}
        showImageDetails={showImageDetails}
        resetSession={resetSession}
        onClickMessage={onClickMessage}
        assetRepository={assetRepository}
        isConversationLoaded={isConversationLoaded}
        updateConversationLastRead={updateConversationLastRead}
      />
    );
  }

  if (false) {
    return (
      <VirtualizedMessageListWrapper
        conversation={conversation}
        selfUser={selfUser}
        conversationRepository={conversationRepository}
        assetRepository={assetRepository}
        messageRepository={messageRepository}
        contextMessageActions={contextMessageActions}
        invitePeople={invitePeople}
        cancelConnectionRequest={cancelConnectionRequest}
        showUserDetails={showUserDetails}
        showMessageDetails={showMessageDetails}
        showMessageReactions={showMessageReactions}
        showParticipants={showParticipants}
        showImageDetails={showImageDetails}
        resetSession={resetSession}
        onClickMessage={onClickMessage}
        isConversationLoaded={isConversationLoaded}
        onLoading={onLoading}
        getVisibleCallback={getVisibleCallback}
        isMsgElementsFocusable={isMsgElementsFocusable}
        setMsgElementsFocusable={setMsgElementsFocusable}
        isRightSidebarOpen={isRightSidebarOpen}
        updateConversationLastRead={updateConversationLastRead}
      />
    );
  }

  return (
    <MessagesList
      conversation={conversation}
      selfUser={selfUser}
      conversationRepository={conversationRepository}
      assetRepository={assetRepository}
      messageRepository={messageRepository}
      contextMessageActions={contextMessageActions}
      invitePeople={invitePeople}
      cancelConnectionRequest={cancelConnectionRequest}
      showUserDetails={showUserDetails}
      showMessageDetails={showMessageDetails}
      showMessageReactions={showMessageReactions}
      showParticipants={showParticipants}
      showImageDetails={showImageDetails}
      resetSession={resetSession}
      onClickMessage={onClickMessage}
      onLoading={onLoading}
      getVisibleCallback={getVisibleCallback}
      isMsgElementsFocusable={isMsgElementsFocusable}
      setMsgElementsFocusable={setMsgElementsFocusable}
      isRightSidebarOpen={isRightSidebarOpen}
      updateConversationLastRead={updateConversationLastRead}
    />
  );
};
