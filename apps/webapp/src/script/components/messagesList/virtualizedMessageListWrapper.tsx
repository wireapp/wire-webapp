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

import {useRef, type FunctionComponent} from 'react';

import {isNull} from '@sindresorhus/is';
import cx from 'classnames';

import {TabIndex} from '@wireapp/react-ui-kit';

import {VirtualizedMessagesList} from 'Components/messagesList/virtualizedMessagesList/virtualizedMessagesList';

import {MessagesListParams} from './messageList.types';

export const VirtualizedMessageListWrapper: FunctionComponent<MessagesListParams> = ({
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
}: MessagesListParams) => {
  const parentRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      ref={parentRef}
      id="message-list"
      className={cx('message-list', {'is-right-panel-open': isRightSidebarOpen})}
      tabIndex={TabIndex.UNFOCUSABLE}
    >
      {!isConversationLoaded && (
        <div className="conversation-loading">
          <div className="icon-spinner spin accent-text"></div>
        </div>
      )}

      {isNull(parentRef.current) ? (
        parentRef.current
      ) : (
        <VirtualizedMessagesList
          parentElement={parentRef.current}
          conversation={conversation}
          cancelPendingReadReceiptsForConversation={cancelPendingReadReceiptsForConversation}
          cancelConnectionRequest={cancelConnectionRequest}
          resetSession={resetSession}
          invitePeople={invitePeople}
          onClickMessage={onClickMessage}
          showUserDetails={showUserDetails}
          showMessageDetails={showMessageDetails}
          showMessageReactions={showMessageReactions}
          showImageDetails={showImageDetails}
          showParticipants={showParticipants}
          selfUser={selfUser}
          conversationRepository={conversationRepository}
          assetRepository={assetRepository}
          messageRepository={messageRepository}
          loadUsersByIdsFromDb={loadUsersByIdsFromDb}
          messageActions={messageActions}
          getVisibleCallback={getVisibleCallback}
          isMsgElementsFocusable={isMsgElementsFocusable}
          setMsgElementsFocusable={setMsgElementsFocusable}
          updateConversationLastRead={updateConversationLastRead}
          onLoading={onLoading}
          isConversationLoaded={isConversationLoaded}
        />
      )}
    </div>
  );
};
