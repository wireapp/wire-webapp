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

import {MessageActions} from './message';

import {AssetRepository} from '../../repositories/assets/assetRepository';
import {ConversationRepository} from '../../repositories/conversation/ConversationRepository';
import {MessageRepository} from '../../repositories/conversation/MessageRepository';
import {Conversation} from '../../repositories/entity/Conversation';
import {ContentMessage} from '../../repositories/entity/message/contentMessage';
import {DecryptErrorMessage} from '../../repositories/entity/message/decryptErrorMessage';
import {MemberMessage} from '../../repositories/entity/message/memberMessage';
import {Message as MessageEntity} from '../../repositories/entity/message/message';
import {User} from '../../repositories/entity/User';
import {ServiceEntity} from '../../repositories/integration/ServiceEntity';
import type {UserRepository} from '../../repositories/user/userRepository';

export interface MessagesListParams {
  assetRepository: AssetRepository;
  cancelConnectionRequest: (message: MemberMessage) => void;
  conversation: Conversation;
  conversationRepository: ConversationRepository;
  cancelPendingReadReceiptsForConversation: (conversation: Conversation) => void;
  getVisibleCallback: (conversationEntity: Conversation, messageEntity: MessageEntity) => (() => void) | undefined;
  invitePeople: (conversation: Conversation) => void;
  messageActions: {
    deleteMessage: (conversation: Conversation, message: MessageEntity) => void;
    deleteMessageEveryone: (conversation: Conversation, message: MessageEntity) => void;
  };
  messageRepository: MessageRepository;
  loadUsersByIdsFromDb: UserRepository['getUsersByIdsFromDb'];
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
