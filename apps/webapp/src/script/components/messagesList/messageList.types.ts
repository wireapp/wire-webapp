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

import React from 'react';

import {MessageActions} from 'Components/messagesList/message';
import {AssetRepository} from 'Repositories/assets/assetRepository';
import {ConversationRepository} from 'Repositories/conversation/conversationRepository';
import {MessageRepository} from 'Repositories/conversation/messageRepository';
import {Conversation} from 'Repositories/entity/conversation';
import {ContentMessage} from 'Repositories/entity/message/contentMessage';
import {DecryptErrorMessage} from 'Repositories/entity/message/decryptErrorMessage';
import {MemberMessage} from 'Repositories/entity/message/memberMessage';
import {Message as MessageEntity} from 'Repositories/entity/message/message';
import {User} from 'Repositories/entity/user';
import {ServiceEntity} from 'Repositories/integration/serviceEntity';

export interface MessagesListParams {
  assetRepository: AssetRepository;
  cancelConnectionRequest: (message: MemberMessage) => void;
  conversation: Conversation;
  conversationRepository: ConversationRepository;
  getVisibleCallback: (conversationEntity: Conversation, messageEntity: MessageEntity) => (() => void) | undefined;
  invitePeople: (conversation: Conversation) => void;
  messageActions: {
    deleteMessage: (conversation: Conversation, message: MessageEntity) => void;
    deleteMessageEveryone: (conversation: Conversation, message: MessageEntity) => void;
  };
  messageRepository: MessageRepository;
  onClickMessage: MessageActions['onClickMessage'];
  onLoading: (isLoading: boolean) => void;
  resetSession: (messageError: DecryptErrorMessage) => void;
  selfUser: User;
  showImageDetails: (message: ContentMessage, event: React.UIEvent) => void;
  showMessageDetails: (message: MessageEntity, showReactions?: boolean) => void;
  showMessageReactions: (message: MessageEntity, showReactions?: boolean) => void;
  showParticipants: (users: User[]) => void;
  showUserDetails: (user: User | ServiceEntity) => void;
  isMsgElementsFocusable: boolean;
  setMsgElementsFocusable: (isMsgElementsFocusable: boolean) => void;
  isRightSidebarOpen?: boolean;
  updateConversationLastRead: (conversation: Conversation) => void;
  isConversationLoaded: boolean;
}
