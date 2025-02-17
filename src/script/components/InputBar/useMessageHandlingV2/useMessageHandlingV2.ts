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

import {LexicalEditor} from 'lexical';

import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {MessageRepository} from 'src/script/conversation/MessageRepository';
import {Conversation} from 'src/script/entity/Conversation';
import {EventRepository} from 'src/script/event/EventRepository';

interface UseMessageHandlingProps {
  conversation: Conversation;
  conversationRepository: ConversationRepository;
  eventRepository: EventRepository;
  messageRepository: MessageRepository;
  editorRef: React.RefObject<LexicalEditor>;
  onResetDraftState: () => void;
  onSaveDraft: (replyId?: string) => void;
}

export const useMessageHandlingV2 = ({
  conversation,
  conversationRepository,
  eventRepository,
  messageRepository,
  editorRef,
  onResetDraftState,
  onSaveDraft,
}: UseMessageHandlingProps) => {
  return {};
};
