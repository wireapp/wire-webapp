/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import type {ElementType, MessageDetails} from './contentMessage/asset/textMessageRenderer';

import type {QualifiedId} from '../../../apiClient/user/qualifiedId';
import type {MessageRepository} from '../../../repositories/conversation/MessageRepository';
import type {Conversation} from '../../../repositories/entity/Conversation';
import type {ContentMessage} from '../../../repositories/entity/message/contentMessage';
import type {DecryptErrorMessage} from '../../../repositories/entity/message/decryptErrorMessage';
import type {MemberMessage as MemberMessageEntity} from '../../../repositories/entity/message/memberMessage';
import {Message as BaseMessage} from '../../../repositories/entity/message/message';
import type {User} from '../../../repositories/entity/User';
import type {ServiceEntity} from '../../../repositories/integration/ServiceEntity';
import type {TeamState} from '../../../repositories/team/TeamState';
import type {UserRepository} from '../../../repositories/user/userRepository';

export type ScrollToElement = (elm: {center?: boolean; element: HTMLElement}, isUnread?: boolean) => void;

export interface MessageActions {
  onClickAvatar: (user: User | ServiceEntity) => void;
  onClickCancelRequest: (message: MemberMessageEntity) => void;
  onClickImage: (message: ContentMessage, event: React.UIEvent) => void;
  onClickInvitePeople: () => void;
  onClickReactionDetails: (message: BaseMessage) => void;
  onClickMessage: (event: MouseEvent | KeyboardEvent, elementType: ElementType, messageDetails: MessageDetails) => void;
  onClickParticipants: (participants: User[]) => void;
  onClickDetails: (message: BaseMessage) => void;
  onClickResetSession: (messageError: DecryptErrorMessage) => void;
  onClickTimestamp: (messageId: string) => void;
}

export interface MessageParams extends MessageActions {
  conversation: Conversation;
  cancelPendingReadReceiptsForConversation: (conversation: Conversation) => void;
  hasReadReceiptsTurnedOn: boolean;
  isLastDeliveredMessage: boolean;
  isSelfTemporaryGuest: boolean;
  message: BaseMessage;
  /** whether the message should display the user avatar and user name before the actual content */
  hideHeader: boolean;
  messageActions: {
    deleteMessage: (conversation: Conversation, message: BaseMessage) => void;
    deleteMessageEveryone: (conversation: Conversation, message: BaseMessage) => void;
  };
  messageRepository: MessageRepository;
  loadUsersByIdsFromDb: UserRepository['getUsersByIdsFromDb'];
  onVisible?: () => void;
  onVisibilityLost?: () => void;
  selfId: QualifiedId;
  shouldShowInvitePeople: boolean;
  teamState?: TeamState;
  /** whether the message is being accessed using the keyboard (will then show the focus state of the elements) */
  isFocused: boolean;
  /** will visually highlight the message when it's being loaded */
  isHighlighted: boolean;
  handleFocus: (id: string) => void;
  handleArrowKeyDown: (e: React.KeyboardEvent) => void;
  isMsgElementsFocusable: boolean;
  setMsgElementsFocusable: (isMsgElementsFocusable: boolean) => void;
}
