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
import {t} from 'Util/LocalizerUtil';

interface UseMessageHandlingProps {
  conversation: Conversation;
  conversationRepository: ConversationRepository;
  eventRepository: EventRepository;
  messageRepository: MessageRepository;
  editorRef: React.RefObject<LexicalEditor>;
  onResetDraftState: () => void;
  onSaveDraft: (replyId?: string) => void;
}

export const useMessageHandling = ({
  conversation,
  conversationRepository,
  eventRepository,
  messageRepository,
  editorRef,
  onResetDraftState,
  onSaveDraft,
}: UseMessageHandlingProps) => {
  const [editedMessage, setEditedMessage] = useState<ContentMessage | undefined>();
  const [replyMessageEntity, setReplyMessageEntity] = useState<ContentMessage | null>(null);

  const generateQuote = async (): Promise<OutgoingQuote | undefined> => {
    if (!replyMessageEntity) {
      return undefined;
    }

    const event = await eventRepository.eventService.loadEvent(
      replyMessageEntity.conversation_id,
      replyMessageEntity.id,
    );
    if (!event) {
      return undefined;
    }

    const messageHash = await MessageHasher.hashEvent(event);
    return new QuoteEntity({
      hash: messageHash,
      messageId: replyMessageEntity.id,
      userId: replyMessageEntity.from,
    }) as OutgoingQuote;
  };

  const sendMessageEdit = (messageText: string, mentions: MentionEntity[]): void | Promise<any> => {
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
  };

  const sendTextMessage = (messageText: string, mentions: MentionEntity[]) => {
    if (messageText.length) {
      const mentionEntities = mentions.slice(0);

      void generateQuote().then(quoteEntity => {
        void messageRepository.sendTextWithLinkPreview(conversation, messageText, mentionEntities, quoteEntity);
        cancelMessageReply();
      });
    }
  };

  const sendMessage = (text: string, mentions: MentionEntity[]): void => {
    const messageTrimmedStart = text.trimStart();
    const messageText = messageTrimmedStart.trimEnd();

    if (editedMessage) {
      void sendMessageEdit(messageText, mentions);
    } else {
      sendTextMessage(messageText, mentions);
    }

    editorRef.current?.focus();
    onResetDraftState();
  };

  const handleSendMessage = async (text: string, mentions: MentionEntity[]) => {
    await conversationRepository.refreshMLSConversationVerificationState(conversation);
    const isE2EIDegraded = conversation.mlsVerificationState() === ConversationVerificationState.DEGRADED;

    if (isE2EIDegraded) {
      PrimaryModal.show(PrimaryModal.type.CONFIRM, {
        secondaryAction: {
          action: () => {
            conversation.mlsVerificationState(ConversationVerificationState.UNVERIFIED);
            sendMessage(text, mentions);
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
      sendMessage(text, mentions);
    }
  };

  const cancelMessageEditing = (resetDraft = true) => {
    setEditedMessage(undefined);
    setReplyMessageEntity(null);

    if (resetDraft) {
      onResetDraftState();
    }
  };

  const cancelMessageReply = (resetDraft = true) => {
    setReplyMessageEntity(null);

    if (resetDraft) {
      onResetDraftState();
    }
  };

  const editMessage = (messageEntity?: ContentMessage) => {
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
  };

  const replyMessage = (messageEntity: ContentMessage): void => {
    if (messageEntity?.isReplyable() && messageEntity !== replyMessageEntity) {
      cancelMessageReply(false);
      cancelMessageEditing(!!editedMessage);
      setReplyMessageEntity(messageEntity);
      onSaveDraft(messageEntity.id);

      editorRef.current?.focus();
    }
  };

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
  }, [handleRepliedMessageDeleted, handleRepliedMessageUpdated]);

  return {
    editedMessage,
    replyMessageEntity,
    isEditing: !!editedMessage,
    isReplying: !!replyMessageEntity,
    handleSendMessage,
    cancelMessageEditing,
    cancelMessageReply,
    editMessage,
    replyMessage,
  };
};
