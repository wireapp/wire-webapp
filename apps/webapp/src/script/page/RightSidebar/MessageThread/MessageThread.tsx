/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {FC, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {amplify} from 'amplify';

import {WebAppEvents} from '@wireapp/webapp-events';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import {SendMessageButton} from 'Components/InputBar/InputBarControls/SendMessageButton/SendMessageButton';
import {Message as MessageComponent} from 'Components/MessagesList/Message';
import {MarkerComponent} from 'Components/MessagesList/Message/Marker';
import {THREAD_REPLY_SENT, ThreadReplySentPayload} from 'Components/MessagesList/threading/threadingEvents';
import {groupMessagesBySenderAndTime, isMarker} from 'Components/MessagesList/utils/messagesGroup';
import {EventMapper} from 'Repositories/conversation/EventMapper';
import {MessageRepository} from 'Repositories/conversation/MessageRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {Message as MessageEntity} from 'Repositories/entity/message/Message';
import {User} from 'Repositories/entity/User';
import {EventRepository} from 'Repositories/event/EventRepository';
import {isContentMessage} from 'src/script/guards/Message';
import {useRoveFocus} from 'src/script/hooks/useRoveFocus';
import {ActionsViewModel} from 'src/script/view_model/ActionsViewModel';
import {t} from 'Util/LocalizerUtil';

import {PanelHeader} from '../PanelHeader';

interface MessageThreadProps {
  activeConversation: Conversation;
  rootMessage: MessageEntity;
  onClose: () => void;
  messageRepository: MessageRepository;
  eventRepository: EventRepository;
  selfUser: User;
  actionsViewModel: ActionsViewModel;
}

export const MessageThread: FC<MessageThreadProps> = ({
  activeConversation,
  rootMessage,
  onClose,
  messageRepository,
  eventRepository,
  selfUser,
  actionsViewModel,
}) => {
  const rootContentMessage = isContentMessage(rootMessage) ? rootMessage : null;
  const threadId = rootMessage.threadId ?? rootMessage.id;

  const [threadReplies, setThreadReplies] = useState<ContentMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const threadListRef = useRef<HTMLDivElement | null>(null);
  const eventMapperRef = useRef(new EventMapper());
  const [isMsgElementsFocusable, setMsgElementsFocusable] = useState(false);

  const loadThreadReplies = useCallback(async () => {
    if (!threadId || !activeConversation?.id) {
      setThreadReplies([]);
      return;
    }

    const events = await eventRepository.eventService.loadThreadEvents(activeConversation.id, threadId);
    const mappedMessages = eventMapperRef.current.mapJsonEvents(events, activeConversation);

    const contentMessages = mappedMessages.filter(isContentMessage);
    const messagesWithUsers = await Promise.all(
      contentMessages.map(message => messageRepository.ensureMessageSender(message)),
    );

    setThreadReplies(messagesWithUsers);
  }, [activeConversation, eventRepository.eventService, messageRepository, threadId]);

  const threadMessages = useMemo(() => {
    if (!rootContentMessage) {
      return [];
    }

    const sortedReplies = [...threadReplies].sort(
      (firstMessage, secondMessage) =>
        firstMessage.timestamp() - secondMessage.timestamp() || firstMessage.id.localeCompare(secondMessage.id),
    );
    return [rootContentMessage, ...sortedReplies.filter(reply => reply.id !== rootContentMessage.id)];
  }, [rootContentMessage, threadReplies]);

  const {
    focusedId,
    handleKeyDown: handleRoveKeyDown,
    setFocusedId,
  } = useRoveFocus(threadMessages.map(message => message.id));
  const groupedThreadMessages = useMemo(
    () => groupMessagesBySenderAndTime(threadMessages, Number.MAX_SAFE_INTEGER),
    [threadMessages],
  );

  useEffect(() => {
    void loadThreadReplies();
  }, [loadThreadReplies]);

  useEffect(() => {
    const handleReply = (payload: ThreadReplySentPayload) => {
      if (payload.conversationId === activeConversation.id && payload.threadId === threadId) {
        void loadThreadReplies();
      }
    };

    const handleEventFromBackend = (event: {conversation?: string}) => {
      if (event?.conversation === activeConversation.id) {
        void loadThreadReplies();
      }
    };

    amplify.subscribe(THREAD_REPLY_SENT, handleReply);
    amplify.subscribe(WebAppEvents.CONVERSATION.EVENT_FROM_BACKEND, handleEventFromBackend);

    return () => {
      amplify.unsubscribe(THREAD_REPLY_SENT, handleReply);
      amplify.unsubscribe(WebAppEvents.CONVERSATION.EVENT_FROM_BACKEND, handleEventFromBackend);
    };
  }, [activeConversation.id, loadThreadReplies, threadId]);

  useEffect(() => {
    // Delay until panel transition settles.
    const timeoutId = window.setTimeout(() => inputRef.current?.focus(), 0);

    return () => window.clearTimeout(timeoutId);
  }, [threadId]);

  useEffect(() => {
    threadListRef.current?.scrollTo({top: threadListRef.current.scrollHeight});
  }, [groupedThreadMessages.length, threadId]);

  const handleSend = useCallback(async () => {
    const trimmedMessage = draft.trim();
    if (!trimmedMessage.length || isSending) {
      return;
    }

    setIsSending(true);

    try {
      await messageRepository.sendTextWithLinkPreview({
        conversation: activeConversation,
        textMessage: trimmedMessage,
        mentions: [],
        attachments: [],
        threadId,
      });

      setDraft('');
      amplify.publish(THREAD_REPLY_SENT, {conversationId: activeConversation.id, threadId});
      void loadThreadReplies();
    } finally {
      setIsSending(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [activeConversation, draft, isSending, loadThreadReplies, messageRepository, threadId]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        void handleSend();
      }
    },
    [handleSend],
  );

  const repliesTitle = `${threadReplies.length} ${threadReplies.length === 1 ? 'reply' : 'replies'}`;

  if (!rootContentMessage) {
    return null;
  }

  return (
    <div id="message-thread" className="panel__page panel__message-thread">
      <PanelHeader
        onClose={onClose}
        showBackArrow={false}
        title={`Thread - ${repliesTitle}`}
        titleDataUieName="message-thread-title"
        shouldFocusFirstButton={false}
      />

      <FadingScrollbar ref={threadListRef} className="message-list panel__content" style={{flexGrow: 1}}>
        <div className="messages" data-uie-name="message-thread-messages">
          {groupedThreadMessages.flatMap(group => {
            if (isMarker(group)) {
              return <MarkerComponent key={`${group.type}-${group.timestamp}`} marker={group} />;
            }

            return group.messages.map(message => (
              <MessageComponent
                key={`${message.id}-${message.timestamp()}`}
                message={message}
                hideHeader={message.timestamp() !== group.firstMessageTimestamp}
                messageActions={actionsViewModel}
                conversation={activeConversation}
                hasReadReceiptsTurnedOn={false}
                isLastDeliveredMessage={false}
                isHighlighted={false}
                isSelfTemporaryGuest={selfUser.isTemporaryGuest()}
                messageRepository={messageRepository}
                onClickAvatar={() => undefined}
                onClickCancelRequest={() => undefined}
                onClickImage={() => undefined}
                onClickInvitePeople={() => undefined}
                onClickReactionDetails={() => undefined}
                onClickMessage={() => true}
                onClickParticipants={() => undefined}
                onClickDetails={() => undefined}
                onClickThread={() => undefined}
                onClickResetSession={() => undefined}
                onClickTimestamp={() => undefined}
                selfId={selfUser.qualifiedId}
                shouldShowInvitePeople={false}
                isFocused={focusedId === message.id}
                handleFocus={setFocusedId}
                handleArrowKeyDown={handleRoveKeyDown}
                isMsgElementsFocusable={isMsgElementsFocusable}
                setMsgElementsFocusable={setMsgElementsFocusable}
                showThreadSummary={false}
              />
            ));
          })}
        </div>
      </FadingScrollbar>

      <div
        className="panel__footer"
        data-uie-name="message-thread-composer"
        style={{display: 'flex', gap: 8, alignItems: 'center'}}
      >
        <input
          ref={inputRef}
          data-uie-name="input-thread-message"
          className="conversation-input-bar-text"
          type="text"
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('tooltipConversationInputPlaceholder')}
          disabled={isSending}
          style={{flexGrow: 1}}
        />
        <div data-uie-name="do-send-thread-message" style={{display: 'flex'}}>
          <SendMessageButton
            isDisabled={isSending || !draft.trim().length}
            isLoading={isSending}
            onSend={() => void handleSend()}
          />
        </div>
      </div>
    </div>
  );
};
