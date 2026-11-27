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

import type {FunctionComponent, ReactElement} from 'react';

import {MessagesList} from './messageList';
import {MessagesListParams} from './messageList.types';
import {VirtualizedMessageListWrapper} from './virtualizedMessageListWrapper';

import {Config} from '../../Config';

type MessageListWrapperProps = MessagesListParams & {
  /** Passed in, like the notice, so that the lists stay out of the import cycle of the app context */
  isOutboxEnabled: boolean;
  /** Shown while offline; `null` while there is none */
  offlineNotice: ReactElement | null;
};

export const MessageListWrapper: FunctionComponent<MessageListWrapperProps> = ({
  assetRepository,
  conversation,
  cancelPendingReadReceiptsForConversation,
  selfUser,
  conversationRepository,
  messageRepository,
  loadUsersByIdsFromDb,
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
  messageActions,
  onLoading,
  isMsgElementsFocusable,
  setMsgElementsFocusable,
  isRightSidebarOpen = false,
  isConversationLoaded,
  updateConversationLastRead,
  isOutboxEnabled,
  offlineNotice,
}: MessageListWrapperProps) => {
  const isVirtualizedMessagesListEnabled = Config.getConfig().FEATURE.ENABLE_VIRTUALIZED_MESSAGES_LIST;

  if (isVirtualizedMessagesListEnabled) {
    return (
      <VirtualizedMessageListWrapper
        conversation={conversation}
        cancelPendingReadReceiptsForConversation={cancelPendingReadReceiptsForConversation}
        selfUser={selfUser}
        conversationRepository={conversationRepository}
        assetRepository={assetRepository}
        messageRepository={messageRepository}
        loadUsersByIdsFromDb={loadUsersByIdsFromDb}
        messageActions={messageActions}
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
        offlineNotice={offlineNotice}
        splitBySendingState={isOutboxEnabled}
      />
    );
  }

  return (
    <MessagesList
      conversation={conversation}
      cancelPendingReadReceiptsForConversation={cancelPendingReadReceiptsForConversation}
      selfUser={selfUser}
      conversationRepository={conversationRepository}
      assetRepository={assetRepository}
      messageRepository={messageRepository}
      loadUsersByIdsFromDb={loadUsersByIdsFromDb}
      messageActions={messageActions}
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
      isOutboxEnabled={isOutboxEnabled}
      offlineNotice={offlineNotice}
    />
  );
};
