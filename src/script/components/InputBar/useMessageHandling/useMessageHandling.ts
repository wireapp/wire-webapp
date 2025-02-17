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

import {useCallback, useEffect, useState} from 'react';

import {amplify} from 'amplify';
import {LexicalEditor} from 'lexical';

import {WebAppEvents} from '@wireapp/webapp-events';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {showWarningModal} from 'Components/Modals/utils/showWarningModal';
import {Config} from 'src/script/Config';
import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {ConversationVerificationState} from 'src/script/conversation/ConversationVerificationState';
import {MessageRepository, OutgoingQuote} from 'src/script/conversation/MessageRepository';
import {Conversation} from 'src/script/entity/Conversation';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {ConversationError} from 'src/script/error/ConversationError';
import {EventRepository} from 'src/script/event/EventRepository';
import {MentionEntity} from 'src/script/message/MentionEntity';
import {MessageHasher} from 'src/script/message/MessageHasher';
import {QuoteEntity} from 'src/script/message/QuoteEntity';
import {StorageRepository} from 'src/script/storage';
import {t} from 'Util/LocalizerUtil';

import {useDraftState} from './useDraftState/useDraftState';

import {MessageContent} from '../common/messageContent/messageContent';
import {handleClickOutsideOfInputBar} from '../util/clickHandlers';

interface UseMessageHandlingProps {
  messageContent: MessageContent;
  conversation: Conversation;
  conversationRepository: ConversationRepository;
  eventRepository: EventRepository;
  messageRepository: MessageRepository;
  storageRepository: StorageRepository;
  editorRef: React.RefObject<LexicalEditor>;
  pastedFile: File | null;
  sendPastedFile: () => void;
}

export const useMessageHandling = ({
  messageContent,
  conversation,
  conversationRepository,
  eventRepository,
  messageRepository,
  storageRepository,
  editorRef,
  pastedFile,
  sendPastedFile,
}: UseMessageHandlingProps) => {
  const [editedMessage, setEditedMessage] = useState<ContentMessage | undefined>();
  const [replyMessageEntity, setReplyMessageEntity] = useState<ContentMessage | null>(null);

  const isEditing = !!editedMessage;
  const isReplying = !!replyMessageEntity;

  const draftState = useDraftState({
    conversation,
    storageRepository,
    messageRepository,
    editorRef,
    editedMessageId: editedMessage?.id,
    replyMessageEntityId: replyMessageEntity?.id,
    onLoad: draftState => {
      const reply = draftState.messageReply;
      if (reply?.isReplyable()) {
        setReplyMessageEntity(reply);
      }

      const editedMessage = draftState.editedMessage;
      if (editedMessage) {
        setEditedMessage(editedMessage);
      }
    },
  });

  const handleSaveDraft = useCallback(
    async (replyId?: string) => {
      await draftState.save(JSON.stringify(editorRef.current?.getEditorState().toJSON()), messageContent.text, replyId);
    },
    [draftState, editorRef, messageContent.text],
  );

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

  const cancelMessageReply = useCallback(
    (resetDraft = true) => {
      setReplyMessageEntity(null);
      void handleSaveDraft();

      if (resetDraft) {
        draftState.reset();
      }
    },
    [draftState, handleSaveDraft],
  );

  const cancelMessageEditing = useCallback(
    (resetDraft = true) => {
      setEditedMessage(undefined);
      setReplyMessageEntity(null);

      if (resetDraft) {
        draftState.reset();
      }
    },
    [draftState],
  );

  const sendMessageEdit = useCallback(
    (messageText: string, mentions: MentionEntity[]): void | Promise<any> => {
      const mentionEntities = mentions.slice(0);
      cancelMessageEditing(true);

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
    [cancelMessageEditing, cancelMessageReply, conversation, editedMessage, messageRepository],
  );

  const sendTextMessage = useCallback(
    (messageText: string, mentions: MentionEntity[]) => {
      if (messageText.length) {
        const mentionEntities = mentions.slice(0);

        void generateQuote().then(quoteEntity => {
          void messageRepository.sendTextWithLinkPreview(conversation, messageText, mentionEntities, quoteEntity);
          cancelMessageReply();
        });
      }
    },
    [cancelMessageReply, conversation, generateQuote, messageRepository],
  );

  const sendMessage = useCallback((): void => {
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
      void sendMessageEdit(messageText, mentions);
    } else {
      sendTextMessage(messageText, mentions);
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
  ]);

  const handleSendMessage = useCallback(async () => {
    await conversationRepository.refreshMLSConversationVerificationState(conversation);
    const isE2EIDegraded = conversation.mlsVerificationState() === ConversationVerificationState.DEGRADED;

    if (isE2EIDegraded) {
      PrimaryModal.show(PrimaryModal.type.CONFIRM, {
        secondaryAction: {
          action: () => {
            conversation.mlsVerificationState(ConversationVerificationState.UNVERIFIED);
            sendMessage();
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
      sendMessage();
    }
  }, [conversation, conversationRepository, sendMessage]);

  const editMessage = useCallback(
    (messageEntity?: ContentMessage) => {
      if (messageEntity?.isEditable() && messageEntity !== editedMessage) {
        cancelMessageReply();
        cancelMessageEditing(true);
        setEditedMessage(messageEntity);

        const quote = messageEntity.quote();
        if (quote && conversation) {
          void messageRepository
            .getMessageInConversationById(conversation, quote.messageId)
            .then(quotedMessage => setReplyMessageEntity(quotedMessage));
        }
      }
    },
    [cancelMessageEditing, cancelMessageReply, conversation, editedMessage, messageRepository],
  );

  const replyMessage = useCallback(
    (messageEntity: ContentMessage) => {
      if (messageEntity?.isReplyable() && messageEntity !== replyMessageEntity) {
        cancelMessageReply(false);
        cancelMessageEditing(!!editedMessage);
        setReplyMessageEntity(messageEntity);
        void handleSaveDraft(messageEntity.id);

        editorRef.current?.focus();
      }
    },
    [cancelMessageEditing, cancelMessageReply, editedMessage, editorRef, handleSaveDraft, replyMessageEntity],
  );

  const handleRepliedMessageDeleted = useCallback(
    (messageId: string) => {
      if (replyMessageEntity?.id === messageId) {
        setReplyMessageEntity(null);
      }
    },
    [replyMessageEntity],
  );

  const handleRepliedMessageUpdated = useCallback(
    (originalMessageId: string, messageEntity: ContentMessage) => {
      if (replyMessageEntity?.id === originalMessageId) {
        setReplyMessageEntity(messageEntity);
      }
    },
    [replyMessageEntity],
  );

  useEffect(() => {
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.REPLY, replyMessage);
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, handleRepliedMessageDeleted);
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.UPDATED, handleRepliedMessageUpdated);
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.EDIT, editMessage);

    return () => {
      amplify.unsubscribeAll(WebAppEvents.CONVERSATION.MESSAGE.REPLY);
      amplify.unsubscribeAll(WebAppEvents.CONVERSATION.MESSAGE.REMOVED);
      amplify.unsubscribeAll(WebAppEvents.CONVERSATION.MESSAGE.UPDATED);
      amplify.unsubscribeAll(WebAppEvents.CONVERSATION.MESSAGE.EDIT);
    };
  }, [handleRepliedMessageDeleted, replyMessage, editMessage, handleRepliedMessageUpdated]);

  useEffect(() => {
    const onWindowClick = (event: Event): void =>
      handleClickOutsideOfInputBar(event, () => {
        // We want to add a timeout in case the click happens because the user switched conversation and the component is unmounting.
        // In this case we want to keep the edited message for this conversation
        setTimeout(() => {
          cancelMessageEditing(true);
          cancelMessageReply();
        });
      });
    if (isEditing) {
      window.addEventListener('click', onWindowClick);

      return () => {
        window.removeEventListener('click', onWindowClick);
      };
    }

    return () => undefined;
  }, [cancelMessageEditing, cancelMessageReply, isEditing]);

  useEffect(() => {
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.REPLY, replyMessage);
    conversation.isTextInputReady(true);

    return () => {
      amplify.unsubscribeAll(WebAppEvents.CONVERSATION.MESSAGE.REPLY);
      conversation.isTextInputReady(false);
    };
  }, [replyMessage, conversation]);

  return {
    draftState,
    editedMessage,
    replyMessageEntity,
    isEditing,
    isReplying,
    handleSendMessage2: sendMessage,
    handleSendMessage,
    cancelMessageEditing,
    cancelMessageReply,
    editMessage,
    replyMessage,
    generateQuote,
  };
};
