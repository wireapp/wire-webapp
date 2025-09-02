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

import {useRef} from 'react';

import cx from 'classnames';

import {TabIndex} from '@wireapp/react-ui-kit';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import {VirtualizedMessagesList} from 'Components/MessagesList/VirtualizedMessagesList/VirtualizedMessagesList';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {MessagesListParams} from './MessageList.types';

export const VirtualizedMessageListWrapper = ({
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
  messageActions,
  onLoading,
  isMsgElementsFocusable,
  setMsgElementsFocusable,
  isRightSidebarOpen = false,
  isConversationLoaded,
  updateConversationLastRead,
}: MessagesListParams) => {
  const {last_read_timestamp: lastReadTimestamp} = useKoSubscribableChildren(conversation, ['last_read_timestamp']);

  const parentRef = useRef<HTMLDivElement | null>(null);
  const conversationLastReadTimestamp = useRef<number>(lastReadTimestamp);

  return (
    <FadingScrollbar
      ref={parentRef}
      id="message-list"
      className={cx('message-list', {'is-right-panel-open': isRightSidebarOpen})}
      tabIndex={TabIndex.UNFOCUSABLE}
      style={{height: '100%', overflow: 'auto', position: 'relative'}}
    >
      {!isConversationLoaded && (
        <div className="conversation-loading">
          <div className="icon-spinner spin accent-text"></div>
        </div>
      )}

      {parentRef.current && (
        <VirtualizedMessagesList
          parentElement={parentRef.current}
          conversationLastReadTimestamp={conversationLastReadTimestamp}
          conversation={conversation}
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
          messageActions={messageActions}
          getVisibleCallback={getVisibleCallback}
          isMsgElementsFocusable={isMsgElementsFocusable}
          setMsgElementsFocusable={setMsgElementsFocusable}
          updateConversationLastRead={updateConversationLastRead}
          onLoading={onLoading}
          isConversationLoaded={isConversationLoaded}
        />
      )}
    </FadingScrollbar>
  );
};
