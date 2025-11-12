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

import {useCallback, useMemo} from 'react';

import {LexicalEditor} from 'lexical';

import {IAttachment} from '@wireapp/protocol-messaging';

import {useFileUploadState} from 'Components/Conversation/useFilesUploadState/useFilesUploadState';
import {MessageContent} from 'Components/InputBar/common/messageContent/messageContent';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {showWarningModal} from 'Components/Modals/utils/showWarningModal';
import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {ConversationVerificationState} from 'Repositories/conversation/ConversationVerificationState';
import {MessageRepository, OutgoingQuote} from 'Repositories/conversation/MessageRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {EventRepository} from 'Repositories/event/EventRepository';
import {Config} from 'src/script/Config';
import {ConversationError} from 'src/script/error/ConversationError';
import {MentionEntity} from 'src/script/message/MentionEntity';
import {MessageHasher} from 'src/script/message/MessageHasher';
import {QuoteEntity} from 'src/script/message/QuoteEntity';
import {t} from 'Util/LocalizerUtil';

import {useSendFiles} from './useSendFiles/useSendFiles';

interface UseMessageSendProps {
  replyMessageEntity: ContentMessage | null;
  eventRepository: EventRepository;
  messageRepository: MessageRepository;
  conversation: Conversation;
  conversationRepository: ConversationRepository;
  cellsRepository: CellsRepository;
  draftState: {
    reset: () => void;
  };
  cancelMessageEditing: (callback?: () => void) => void;
  cancelMessageReply: () => void;
  editedMessage: ContentMessage | undefined;
  replyMessageCallback: (messageEntity: ContentMessage | null) => void;
  editorRef: React.RefObject<LexicalEditor>;
  pastedFile: File | null;
  sendPastedFile: () => void;
  messageContent: MessageContent;
}

export const useMessageSend = ({
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
}: UseMessageSendProps) => {
  const {getFiles, clearAll} = useFileUploadState();
  const files = getFiles({conversationId: conversation.id});

  const {
    sendFiles,
    clearFiles,
    isLoading: filesSendingLoading,
  } = useSendFiles({files, clearAllFiles: clearAll, cellsRepository, conversationId: conversation.id});

  const cellsEnabled = Config.getConfig().FEATURE.ENABLE_CELLS;

  const generateQuote = useCallback(async (): Promise<OutgoingQuote | undefined> => {
    return !replyMessageEntity
      ? Promise.resolve(undefined)
      : eventRepository.eventService
          .loadEvent(replyMessageEntity.conversation_id, replyMessageEntity.id)
          .then(MessageHasher.hashEvent)
          .then((messageHash: ArrayBuffer) => {
            return new QuoteEntity({
              hash: messageHash,
              messageId: replyMessageEntity.id,
              userId: replyMessageEntity.from,
            }) as OutgoingQuote;
          });
  }, [eventRepository.eventService, replyMessageEntity]);

  const sendMessageEdit = useCallback(
    (messageText: string, mentions: MentionEntity[]): void | Promise<any> => {
      const mentionEntities = mentions.slice(0);
      cancelMessageEditing(() => {
        replyMessageCallback(null);
        draftState.reset();
      });

      if (!messageText.length && editedMessage) {
        return messageRepository.deleteMessageForEveryone(conversation, editedMessage);
      }

      if (editedMessage) {
        messageRepository.sendMessageEdit(conversation, messageText, editedMessage, mentionEntities).catch(error => {
          if (error.type !== ConversationError.TYPE.NO_MESSAGE_CHANGES) {
            throw error;
          }
        });

        cancelMessageReply();
      }
    },
    [
      cancelMessageEditing,
      cancelMessageReply,
      conversation,
      draftState,
      editedMessage,
      messageRepository,
      replyMessageCallback,
    ],
  );

  const getCellAssets = useCallback((): IAttachment[] => {
    return files.map(file => {
      return {
        cellAsset: {
          uuid: file.id,
          contentType: file.type,
          initialName: file.name,
          initialSize: file.size,
          image: file.image,
          audio: file.audio,
          video: file.video,
        },
      };
    });
  }, [files]);

  const sendTextMessage = useCallback(
    (messageText: string, mentions: MentionEntity[]) => {
      const isEmpty = messageText.length === 0;

      if (isEmpty && !cellsEnabled) {
        return;
      }

      const mentionEntities = mentions.slice(0);

      void generateQuote().then(quoteEntity => {
        void messageRepository.sendTextWithLinkPreview({
          conversation,
          textMessage: messageText,
          mentions: mentionEntities,
          quoteEntity,
          attachments: getCellAssets(),
        });
        cancelMessageReply();
      });
    },
    [cancelMessageReply, conversation, generateQuote, messageRepository, getCellAssets, cellsEnabled],
  );

  const isSendingDisabled = useMemo(() => {
    const hasText = messageContent.text.length > 0;
    const hasFiles = files.length > 0;
    const hasSuccessfullyUploadedFiles = hasFiles && files.every(file => file.uploadStatus === 'success');

    if (cellsEnabled) {
      return hasFiles ? !hasSuccessfullyUploadedFiles : !hasText;
    }

    return !hasText;
  }, [messageContent.text, files, cellsEnabled]);

  const sendMessage = useCallback(async (): Promise<void> => {
    if (isSendingDisabled) {
      return;
    }

    if (pastedFile) {
      return void sendPastedFile();
    }

    const text = messageContent.text;
    const mentions = messageContent.mentions ?? [];

    const messageTrimmedStart = text.trimStart();
    const messageText = messageTrimmedStart.trimEnd();

    const config = Config.getConfig();

    const isMessageTextTooLong = text.length > config.MAXIMUM_MESSAGE_LENGTH;

    if (isMessageTextTooLong) {
      showWarningModal(
        t('modalConversationMessageTooLongHeadline'),
        t('modalConversationMessageTooLongMessage', {number: config.MAXIMUM_MESSAGE_LENGTH}),
      );

      return;
    }

    if (editedMessage) {
      await sendMessageEdit(messageText, mentions);
    } else {
      await sendFiles();
      sendTextMessage(messageText, mentions);
      clearFiles();
    }

    editorRef.current?.focus();
    draftState.reset();
  }, [
    pastedFile,
    messageContent.text,
    messageContent.mentions,
    editedMessage,
    editorRef,
    draftState,
    sendPastedFile,
    sendMessageEdit,
    sendTextMessage,
    isSendingDisabled,
    sendFiles,
    clearFiles,
  ]);

  const handleSendMessage = useCallback(async () => {
    await conversationRepository.refreshMLSConversationVerificationState(conversation);
    const isE2EIDegraded = conversation.mlsVerificationState() === ConversationVerificationState.DEGRADED;

    if (isE2EIDegraded) {
      PrimaryModal.show(PrimaryModal.type.CONFIRM, {
        secondaryAction: {
          action: () => {
            conversation.mlsVerificationState(ConversationVerificationState.UNVERIFIED);
            void sendMessage();
          },
          text: t('conversation.E2EISendAnyway'),
        },
        primaryAction: {
          action: () => {},
          text: t('conversation.E2EICancel'),
        },
        text: {
          message: t('conversation.E2EIDegradedNewMessage'),
          title: t('conversation.E2EIConversationNoLongerVerified'),
        },
      });
    } else {
      void sendMessage();
    }
  }, [conversation, conversationRepository, sendMessage]);

  return {
    sendMessage: handleSendMessage,
    generateQuote,
    // Sending messages via messageRepository is synchronous, so we don't need to use a state to track the sending status
    // Although, we need to track the sending status for the files, because it's an async operation
    isSending: filesSendingLoading,
    isSendingDisabled,
  };
};
