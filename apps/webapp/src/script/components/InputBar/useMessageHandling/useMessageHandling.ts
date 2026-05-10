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

import {amplify} from 'amplify';
import {LexicalEditor} from 'lexical';

import {FireAndForgetInvoker} from '@wireapp/core';
import {WebAppEvents} from '@wireapp/webapp-events';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {MessageRepository} from 'Repositories/conversation/MessageRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {EventRepository} from 'Repositories/event/EventRepository';
import {StorageRepository} from 'Repositories/storage';

import {useDraftState} from './useDraftState/useDraftState';
import {useMessageEditing} from './useMessageEditing/useMessageEditing';
import {useMessageReply} from './useMessageReply/useMessageReply';
import {useMessageSend} from './useMessageSend/useMessageSend';
import {useOutsideInputClick} from './useOutsideInputClick/useOutsideInputClick';

import {MessageContent} from '../common/messageContent/messageContent';

interface UseMessageHandlingProps {
  messageContent: MessageContent;
  conversation: Conversation;
  conversationRepository: ConversationRepository;
  eventRepository: EventRepository;
  messageRepository: MessageRepository;
  storageRepository: StorageRepository;
  cellsRepository: CellsRepository;
  editorRef: React.RefObject<LexicalEditor>;
  pastedFile: File | null;
  sendPastedFile: () => void;
  fireAndForgetInvoker: FireAndForgetInvoker;
}

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
  fireAndForgetInvoker,
}: UseMessageHandlingProps) => {
  const {isEditing, editedMessage, editMessage: editMessageCallback, cancelMessageEditing} = useMessageEditing();

  const {isReplying, replyMessage: replyMessageCallback, replyMessageEntity} = useMessageReply();

  const draftState = useDraftState({
    conversation,
    storageRepository,
    messageRepository,
    editorRef,
    fireAndForgetInvoker,
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
      fireAndForgetInvoker.fireAndForget(async () => {
        await handleSaveDraft();
      });

      if (resetDraft) {
        draftState.reset();
      }
    },
    [draftState, fireAndForgetInvoker, handleSaveDraft, replyMessageCallback],
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
    fireAndForgetInvoker,
  });

  const editMessage = useCallback(
    (messageEntity?: ContentMessage) => {
      if (messageEntity?.isEditable() === true && messageEntity !== editedMessage) {
        cancelMessageReply();
        cancelMesssageEditingWithDraftReset();
        editMessageCallback(messageEntity);

        const quote = messageEntity.quote();
        if (quote != null) {
          fireAndForgetInvoker.fireAndForget(async () => {
            const quotedMessage = await messageRepository.getMessageInConversationById(conversation, quote.messageId);
            replyMessageCallback(quotedMessage);
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
      fireAndForgetInvoker,
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
        fireAndForgetInvoker.fireAndForget(async () => {
          await handleSaveDraft(messageEntity.id);
        });

        editorRef.current?.focus();
      }
    },
    [
      cancelMessageEditing,
      cancelMessageReply,
      draftState,
      editorRef,
      fireAndForgetInvoker,
      handleSaveDraft,
      isEditing,
      replyMessageCallback,
      replyMessageEntity,
    ],
  );

  const cancelSending = useCallback(() => {
    if (editedMessage) {
      cancelMesssageEditingWithDraftReset();
    } else if (replyMessageEntity) {
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
