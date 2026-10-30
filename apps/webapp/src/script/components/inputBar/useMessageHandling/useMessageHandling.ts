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

import {useCallback, useEffect} from 'react';

import {isNull, isUndefined} from '@sindresorhus/is';
import {amplify} from 'amplify';
import {LexicalEditor} from 'lexical';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {MessageRepository, type OutgoingQuote} from 'Repositories/conversation/MessageRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {ContentMessage} from 'Repositories/entity/message/contentMessage';
import {EventRepository} from 'Repositories/event/EventRepository';
import {StorageRepository} from 'Repositories/storage';
import type {RootContextValue} from 'src/script/page/rootProvider';
import {WebAppEvents} from 'src/script/webAppEvents';

import {useDraftState} from './useDraftState/useDraftState';
import {useMessageEditing} from './useMessageEditing/useMessageEditing';
import {useMessageReply} from './useMessageReply/useMessageReply';
import {useMessageSend} from './useMessageSend/useMessageSend';
import {useOutsideInputClick} from './useOutsideInputClick/useOutsideInputClick';

import type {DraftState} from '../common/draftState/draftState';
import {MessageContent} from '../common/messageContent/messageContent';

interface UseMessageHandlingProps {
  messageContent: MessageContent;
  conversation: Conversation;
  conversationRepository: ConversationRepository;
  eventRepository: EventRepository;
  messageRepository: MessageRepository;
  storageRepository: StorageRepository;
  cellsRepository: CellsRepository;
  editorRef: React.RefObject<LexicalEditor | null>;
  pastedFile: File | null;
  sendPastedFile: () => void;
  translate: RootContextValue['translate'];
}

type UseMessageHandlingResult = {
  draftState: {
    reset: () => void;
    load: () => Promise<DraftState>;
    save: (editorState: string, text: string, replyId?: string) => Promise<void>;
  };
  editedMessage: ContentMessage | undefined;
  replyMessageEntity: ContentMessage | null;
  isEditing: boolean;
  isReplying: boolean;
  sendMessage: () => Promise<void>;
  cancelSending: () => void;
  cancelMessageEditing: (callback?: () => void) => void;
  cancelMessageReply: (resetDraft?: boolean) => void;
  cancelMesssageEditing: () => void;
  editMessage: (messageEntity?: ContentMessage) => void;
  replyMessage: (messageEntity: ContentMessage) => void;
  generateQuote: () => Promise<OutgoingQuote | undefined>;
  isSending: boolean;
  isSendingDisabled: boolean;
};
export const useMessageHandling = ({
  messageContent,
  conversation,
  conversationRepository,
  cellsRepository,
  eventRepository,
  messageRepository,
  storageRepository,
  editorRef,
  pastedFile,
  sendPastedFile,
  translate,
}: UseMessageHandlingProps): UseMessageHandlingResult => {
  const {isEditing, editedMessage, editMessage: editMessageCallback, cancelMessageEditing} = useMessageEditing();

  const {isReplying, replyMessage: replyMessageCallback, replyMessageEntity} = useMessageReply();

  const draftState = useDraftState({
    conversation,
    storageRepository,
    messageRepository,
    editorRef,
    editedMessageId: editedMessage?.id,
    replyMessageEntityId: replyMessageEntity?.id,
    onLoad: draftState => {
      const reply = draftState.messageReply;

      if (reply?.isReplyable() === true) {
        replyMessageCallback(reply);
      }

      const editedMessage = draftState.editedMessage;
      if (editedMessage !== undefined) {
        editMessageCallback(editedMessage);
      }
    },
  });

  const handleSaveDraft = useCallback(
    async (replyId?: string) => {
      await draftState.save(JSON.stringify(editorRef.current?.getEditorState().toJSON()), messageContent.text, replyId);
    },
    [draftState, editorRef, messageContent.text],
  );

  const cancelMessageReply = useCallback(
    (resetDraft = true) => {
      replyMessageCallback(null);
      void handleSaveDraft();

      if (resetDraft) {
        draftState.reset();
      }
    },
    [draftState, handleSaveDraft, replyMessageCallback],
  );

  const cancelMesssageEditingWithDraftReset = useCallback(() => {
    cancelMessageEditing(() => {
      replyMessageCallback(null);
      draftState.reset();
    });
  }, [cancelMessageEditing, draftState, replyMessageCallback]);

  const {sendMessage, generateQuote, isSending, isSendingDisabled} = useMessageSend({
    replyMessageEntity,
    eventRepository,
    messageRepository,
    conversation,
    conversationRepository,
    cellsRepository,
    draftState,
    cancelMessageEditing,
    cancelMessageReply,
    editedMessage,
    replyMessageCallback,
    editorRef,
    pastedFile,
    sendPastedFile,
    messageContent,
    translate,
  });

  const editMessage = useCallback(
    (messageEntity?: ContentMessage) => {
      if (messageEntity?.isEditable() === true && messageEntity !== editedMessage) {
        cancelMessageReply();
        cancelMesssageEditingWithDraftReset();
        editMessageCallback(messageEntity);

        const quote = messageEntity.quote();
        if (quote != null) {
          void messageRepository.getMessageInConversationById(conversation, quote.messageId).then(quotedMessage => {
            return replyMessageCallback(quotedMessage);
          });
        }
      }
    },
    [
      cancelMessageReply,
      cancelMesssageEditingWithDraftReset,
      conversation,
      editMessageCallback,
      editedMessage,
      messageRepository,
      replyMessageCallback,
    ],
  );

  const replyMessage = useCallback(
    (messageEntity: ContentMessage) => {
      if (messageEntity.isReplyable() && messageEntity !== replyMessageEntity) {
        cancelMessageReply(false);
        cancelMessageEditing(() => {
          if (isEditing) {
            draftState.reset();
          }
        });

        replyMessageCallback(messageEntity);
        void handleSaveDraft(messageEntity.id);

        editorRef.current?.focus();
      }
    },
    [
      cancelMessageEditing,
      cancelMessageReply,
      draftState,
      editorRef,
      handleSaveDraft,
      isEditing,
      replyMessageCallback,
      replyMessageEntity,
    ],
  );

  const cancelSending = useCallback(() => {
    if (!isUndefined(editedMessage)) {
      cancelMesssageEditingWithDraftReset();
    } else if (!isNull(replyMessageEntity)) {
      cancelMessageReply();
    }
  }, [editedMessage, replyMessageEntity, cancelMesssageEditingWithDraftReset, cancelMessageReply]);

  useEffect(() => {
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.REPLY, replyMessage);

    return () => {
      amplify.unsubscribeAll(WebAppEvents.CONVERSATION.MESSAGE.REPLY);
    };
  }, [replyMessage]);

  useOutsideInputClick({
    isEditing,
    callback: () => {
      cancelMesssageEditingWithDraftReset();
      cancelMessageReply();
    },
  });

  useEffect(() => {
    conversation.isTextInputReady(true);

    return () => {
      conversation.isTextInputReady(false);
    };
  }, [conversation]);

  return {
    draftState,
    editedMessage,
    replyMessageEntity,
    isEditing,
    isReplying,
    sendMessage,
    cancelSending,
    cancelMessageEditing,
    cancelMessageReply,
    cancelMesssageEditing: cancelMesssageEditingWithDraftReset,
    editMessage,
    replyMessage,
    generateQuote,
    isSending,
    isSendingDisabled,
  };
};
