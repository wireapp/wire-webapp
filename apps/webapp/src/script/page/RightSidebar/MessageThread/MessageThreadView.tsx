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

import {FC, useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {amplify} from 'amplify';
import cx from 'classnames';
import {createPortal} from 'react-dom';

import {WebAppEvents} from '@wireapp/webapp-events';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import {Giphy} from 'Components/Giphy';
import * as Icon from 'Components/icon';
import {InputBar} from 'Components/InputBar';
import {Message as MessageComponent} from 'Components/MessagesList/Message';
import {MarkerComponent} from 'Components/MessagesList/Message/Marker';
import {useThreadIndexStore} from 'Components/MessagesList/threading/threadIndexStore';
import {THREAD_REPLY_SENT, ThreadReplySentPayload} from 'Components/MessagesList/threading/threadingEvents';
import {
  BackendThreadEvent,
  getThreadIdFromBackendEvent,
  isThreadReplyMessageEvent,
} from 'Components/MessagesList/threading/threadMetadataUtils';
import {useThreadUnreadRepliesStore} from 'Components/MessagesList/threading/threadUnreadRepliesStore';
import {groupMessagesBySenderAndTime, isMarker} from 'Components/MessagesList/utils/messagesGroup';
import {THREAD_PANEL_INTERACTION_EVENT} from 'Components/MessagesList/utils/threadRootHighlightEvents';
import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {EventMapper} from 'Repositories/conversation/EventMapper';
import {MessageRepository} from 'Repositories/conversation/MessageRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {Message as MessageEntity} from 'Repositories/entity/message/Message';
import {User} from 'Repositories/entity/User';
import {ClientEvent} from 'Repositories/event/Client';
import {EventRepository} from 'Repositories/event/EventRepository';
import {GiphyRepository} from 'Repositories/extension/GiphyRepository';
import {PropertiesRepository} from 'Repositories/properties/propertiesRepository';
import {SearchRepository} from 'Repositories/search/SearchRepository';
import {StorageRepository} from 'Repositories/storage';
import {TeamState} from 'Repositories/team/TeamState';
import {isContentMessage} from 'src/script/guards/Message';
import {useRoveFocus} from 'src/script/hooks/useRoveFocus';
import {StatusType} from 'src/script/message/StatusType';
import {ActionsViewModel} from 'src/script/view_model/ActionsViewModel';
import {getLogger} from 'Util/logger';

import {PanelHeader} from '../panelHeader';

const logger = getLogger('MessageThreadView');
const getReactionTargetMessageId = (event?: BackendThreadEvent): string | null =>
  event?.type === ClientEvent.CONVERSATION.REACTION && event.data?.message_id ? event.data.message_id : null;

const hydrateThreadReplySenders = async (
  messages: ContentMessage[],
  messageRepository: MessageRepository,
): Promise<ContentMessage[]> => {
  return Promise.all(
    messages.map(async message => {
      try {
        return (await messageRepository.ensureMessageSender(message)) as ContentMessage;
      } catch {
        return message;
      }
    }),
  );
};

const shouldReplaceThreadReply = (current: ContentMessage, candidate: ContentMessage) => {
  const currentStatus = current.status();
  const candidateStatus = candidate.status();

  if (candidateStatus > currentStatus) {
    return true;
  }

  if (candidateStatus < currentStatus) {
    return false;
  }

  return true;
};

const mergeThreadReplies = (...replyGroups: ContentMessage[][]) => {
  const mergedById = new Map<string, ContentMessage>();

  replyGroups.forEach(replyGroup => {
    replyGroup.forEach(reply => {
      const existing = mergedById.get(reply.id);
      if (!existing || shouldReplaceThreadReply(existing, reply)) {
        mergedById.set(reply.id, reply);
      }
    });
  });

  return Array.from(mergedById.values());
};

const markThreadReplyAsSent = (message: ContentMessage) => {
  if (message.status() === StatusType.SENDING) {
    message.status(StatusType.SENT);
  }

  return message;
};

export type MessageThreadViewProps = {
  rootMessage: MessageEntity;
  activeConversation: Conversation;
  variant: 'main' | 'sidebar';
  onClose?: () => void;
  conversationRepository: ConversationRepository;
  cellsRepository: CellsRepository;
  messageRepository: MessageRepository;
  eventRepository: EventRepository;
  giphyRepository: GiphyRepository;
  propertiesRepository: PropertiesRepository;
  searchRepository: SearchRepository;
  storageRepository: StorageRepository;
  teamState: TeamState;
  isCellsEnabled: boolean;
  selfUser: User;
  actionsViewModel: ActionsViewModel;
};

export const MessageThreadView: FC<MessageThreadViewProps> = ({
  rootMessage,
  activeConversation,
  variant,
  onClose,
  conversationRepository,
  cellsRepository,
  messageRepository,
  eventRepository,
  giphyRepository,
  propertiesRepository,
  searchRepository,
  storageRepository,
  teamState,
  isCellsEnabled,
  selfUser,
  actionsViewModel,
}) => {
  const isSidebarVariant = variant === 'sidebar';
  const threadId = rootMessage.threadId ?? rootMessage.id;

  const [threadReplies, setThreadReplies] = useState<ContentMessage[]>([]);
  const [isGiphyModalOpen, setIsGiphyModalOpen] = useState(false);
  const [isFocusModeOpen, setIsFocusModeOpen] = useState(false);
  const [giphyQuery, setGiphyQuery] = useState('');
  const threadListRef = useRef<HTMLDivElement | null>(null);
  const eventMapperRef = useRef(new EventMapper());
  const latestLoadRequestIdRef = useRef(0);
  const activeConversationRef = useRef(activeConversation);
  const isMountedRef = useRef(true);
  const pendingWindowFocusHandlersRef = useRef(new Set<() => void>());
  const [isMsgElementsFocusable, setMsgElementsFocusable] = useState(false);
  const rootContentMessage = useMemo(() => {
    const rootFromConversation = activeConversation.getMessage(threadId);
    if (isContentMessage(rootFromConversation)) {
      return rootFromConversation;
    }

    return isContentMessage(rootMessage) ? rootMessage : null;
  }, [activeConversation, rootMessage, threadId]);

  activeConversationRef.current = activeConversation;

  const loadThreadReplies = useCallback(async () => {
    const requestId = ++latestLoadRequestIdRef.current;
    const conversation = activeConversationRef.current;

    if (!threadId || !conversation?.id) {
      setThreadReplies([]);
      return;
    }

    try {
      const events = await eventRepository.eventService.loadThreadEvents(conversation.id, threadId);
      const mappedMessages = eventMapperRef.current.mapJsonEvents(events, conversation);

      const contentMessages = mappedMessages.filter(isContentMessage);
      const messagesWithUsers = await hydrateThreadReplySenders(contentMessages, messageRepository);
      const localThreadReplies = conversation
        .messages()
        .filter((message): message is ContentMessage => isContentMessage(message) && message.threadId === threadId);
      const loadedReplies = mergeThreadReplies(localThreadReplies, messagesWithUsers);

      if (isMountedRef.current && requestId === latestLoadRequestIdRef.current) {
        setThreadReplies(previousReplies => mergeThreadReplies(previousReplies, loadedReplies));
      }
    } catch (error) {
      logger.warn(
        `Failed to load thread replies for conversation '${conversation.id}' and thread '${threadId}'`,
        error,
      );
    }
  }, [activeConversation.id, eventRepository.eventService, messageRepository, threadId]);

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
  const threadMessageIds = useMemo(() => new Set(threadMessages.map(message => message.id)), [threadMessages]);
  const threadMessageIdsRef = useRef(threadMessageIds);
  threadMessageIdsRef.current = threadMessageIds;

  useEffect(() => {
    setThreadReplies([]);
  }, [threadId]);

  useEffect(() => {
    void loadThreadReplies();
  }, [loadThreadReplies]);

  useEffect(() => {
    if (threadReplies.length === 0) {
      return;
    }

    const rafId = window.requestAnimationFrame(() => {
      useThreadUnreadRepliesStore.getState().markThreadAsRead(activeConversation.id, threadId);
      useThreadIndexStore.getState().markThreadRead(activeConversation.id, threadId);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [activeConversation.id, groupedThreadMessages.length, threadId, threadReplies.length]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      latestLoadRequestIdRef.current += 1;

      pendingWindowFocusHandlersRef.current.forEach(handler => {
        window.removeEventListener('focus', handler);
      });
      pendingWindowFocusHandlersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const hydrateSentThreadReply = async (messageId: string) => {
      const conversation = activeConversationRef.current;

      try {
        const sentMessage = await messageRepository.getMessageInConversationById(conversation, messageId);
        if (!isContentMessage(sentMessage)) {
          return;
        }

        const withSender = markThreadReplyAsSent(
          (await messageRepository.ensureMessageSender(sentMessage)) as ContentMessage,
        );

        setThreadReplies(previousReplies => mergeThreadReplies(previousReplies, [withSender]));
      } catch {
        // Fall back to a full reload below.
      }
    };

    const handleReply = (payload: ThreadReplySentPayload) => {
      if (payload.conversationId !== activeConversation.id || payload.threadId !== threadId) {
        return;
      }

      if (payload.messageId) {
        setThreadReplies(previousReplies =>
          previousReplies.map(reply => (reply.id === payload.messageId ? markThreadReplyAsSent(reply) : reply)),
        );
        void hydrateSentThreadReply(payload.messageId);
      }

      void loadThreadReplies();
    };

    const appendIncomingThreadReply = async (event: BackendThreadEvent) => {
      if (!event.is_thread_reply || !isThreadReplyMessageEvent(event.type)) {
        return;
      }

      const conversation = activeConversationRef.current;

      try {
        const mappedMessage = eventMapperRef.current.mapJsonEvent(
          event as Parameters<EventMapper['mapJsonEvent']>[0],
          conversation,
        );

        if (!isContentMessage(mappedMessage)) {
          return;
        }

        const [withSender] = await hydrateThreadReplySenders([mappedMessage], messageRepository);
        setThreadReplies(previousReplies => mergeThreadReplies(previousReplies, [withSender]));
      } catch {
        // Fall back to a full reload below.
      }
    };

    const handleEventFromBackend = (event: BackendThreadEvent) => {
      if (event?.conversation !== activeConversation.id) {
        return;
      }

      if (getThreadIdFromBackendEvent(event) === threadId) {
        void appendIncomingThreadReply(event);
        void loadThreadReplies();
        return;
      }

      const reactionTargetMessageId = getReactionTargetMessageId(event);
      if (reactionTargetMessageId && threadMessageIdsRef.current.has(reactionTargetMessageId)) {
        void loadThreadReplies();
      }
    };

    amplify.subscribe(THREAD_REPLY_SENT, handleReply);
    amplify.subscribe(WebAppEvents.CONVERSATION.EVENT_FROM_BACKEND, handleEventFromBackend);

    return () => {
      amplify.unsubscribe(THREAD_REPLY_SENT, handleReply);
      amplify.unsubscribe(WebAppEvents.CONVERSATION.EVENT_FROM_BACKEND, handleEventFromBackend);
    };
  }, [activeConversation.id, loadThreadReplies, messageRepository, threadId]);

  useEffect(() => {
    threadListRef.current?.scrollTo({top: threadListRef.current.scrollHeight});
  }, [groupedThreadMessages.length, threadId]);

  const repliesTitle = `${threadReplies.length} ${threadReplies.length === 1 ? 'reply' : 'replies'}`;
  const openGiphy = useCallback((text: string) => {
    setGiphyQuery(text);
    setIsGiphyModalOpen(true);
  }, []);
  const closeGiphy = useCallback(() => setIsGiphyModalOpen(false), []);
  const uploadImages = useCallback(
    (images: File[]) => messageRepository.uploadImages(activeConversation, images, threadId),
    [activeConversation, messageRepository, threadId],
  );
  const uploadFiles = useCallback(
    (files: File[]) => messageRepository.uploadFiles(activeConversation, files, false, threadId),
    [activeConversation, messageRepository, threadId],
  );
  const uploadDroppedFiles = useCallback(
    (droppedFiles: File[]) => {
      const images: File[] = [];
      const files: File[] = [];

      droppedFiles.forEach(file => {
        if (file.type.startsWith('image/')) {
          images.push(file);
        } else {
          files.push(file);
        }
      });

      if (images.length) {
        uploadImages(images);
      }
      if (files.length) {
        uploadFiles(files);
      }
    },
    [uploadFiles, uploadImages],
  );

  const getThreadVisibleCallback = useCallback(
    (message: MessageEntity) => {
      if (!message.isEphemeral()) {
        return undefined;
      }

      return () => {
        const trigger = () => {
          pendingWindowFocusHandlersRef.current.delete(trigger);

          if (isMountedRef.current) {
            conversationRepository.checkMessageTimer(message as ContentMessage);
          }
        };

        if (document.hasFocus()) {
          trigger();
          return;
        }

        pendingWindowFocusHandlersRef.current.add(trigger);
        window.addEventListener('focus', trigger, {once: true});
      };
    },
    [conversationRepository],
  );
  const markThreadPanelInteraction = useCallback(() => {
    window.dispatchEvent(new CustomEvent(THREAD_PANEL_INTERACTION_EVENT));
  }, []);
  const openFocusMode = useCallback(() => {
    setIsFocusModeOpen(true);
  }, []);
  const closeFocusMode = useCallback(() => {
    setIsFocusModeOpen(false);
  }, []);

  useEffect(() => {
    if (!isFocusModeOpen) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeFocusMode();
      }
    };

    window.addEventListener('keydown', onEscape);
    return () => {
      window.removeEventListener('keydown', onEscape);
    };
  }, [closeFocusMode, isFocusModeOpen]);

  useEffect(() => {
    if (!isFocusModeOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFocusModeOpen]);

  if (!rootContentMessage) {
    return null;
  }

  const messageList = (
    <FadingScrollbar
      ref={threadListRef}
      className={cx('message-list', {panel__content: isSidebarVariant})}
      style={{flexGrow: 1}}
    >
      <div className="messages" data-uie-name="message-thread-messages">
        {groupedThreadMessages.flatMap(group => {
          if (isMarker(group)) {
            return <MarkerComponent key={`${group.type}-${group.timestamp}`} marker={group} />;
          }

          return group.messages.map(message => (
            <MessageComponent
              key={`${message.id}-${message.timestamp()}`}
              className={message.id === rootContentMessage.id ? 'message-thread-root-highlight' : undefined}
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
              onVisible={getThreadVisibleCallback(message)}
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
  );

  const composer = (
    <div
      className={cx({panel__footer: isSidebarVariant})}
      data-uie-name="message-thread-composer"
      style={{padding: isSidebarVariant ? '8px 8px 10px' : undefined}}
    >
      <InputBar
        key={`${activeConversation.id}-${threadId}`}
        threadId={threadId}
        disableRightPanelOffset={isSidebarVariant}
        showPingButton={false}
        focusScope="thread"
        conversation={activeConversation}
        conversationRepository={conversationRepository}
        cellsRepository={cellsRepository}
        eventRepository={eventRepository}
        messageRepository={messageRepository}
        openGiphy={openGiphy}
        propertiesRepository={propertiesRepository}
        searchRepository={searchRepository}
        storageRepository={storageRepository}
        teamState={teamState}
        selfUser={selfUser}
        isCellsEnabled={isCellsEnabled}
        onShiftTab={() => setMsgElementsFocusable(false)}
        uploadDroppedFiles={uploadDroppedFiles}
        uploadImages={uploadImages}
        uploadFiles={uploadFiles}
        uploadPastedFiles={file => uploadDroppedFiles([file])}
        onCellImageUpload={() => undefined}
        onCellAssetUpload={() => undefined}
      />
    </div>
  );

  const threadContent = (
    <div
      id={isSidebarVariant ? (isFocusModeOpen ? 'message-thread-focus-mode' : 'message-thread') : 'message-thread-main'}
      className={cx({
        panel__page: isSidebarVariant,
        'panel__message-thread': isSidebarVariant,
        'panel__message-thread--focus-mode': isSidebarVariant && isFocusModeOpen,
        'message-thread-main': !isSidebarVariant,
      })}
      onFocusCapture={markThreadPanelInteraction}
      onMouseDownCapture={markThreadPanelInteraction}
    >
      {isSidebarVariant && (
        <>
          <PanelHeader
            onClose={isFocusModeOpen ? closeFocusMode : (onClose ?? (() => undefined))}
            showBackArrow={false}
            title={`Thread - ${repliesTitle}`}
            titleDataUieName="message-thread-title"
            shouldFocusFirstButton={false}
          />
          {!isFocusModeOpen && (
            <button
              type="button"
              className="icon-button message-thread-focus-toggle"
              data-uie-name="do-open-thread-focus-mode"
              title="Focus thread"
              aria-label="Focus thread"
              onClick={openFocusMode}
            >
              <Icon.FullscreenIcon />
            </button>
          )}
        </>
      )}

      {messageList}
      {composer}

      {isGiphyModalOpen &&
        giphyQuery &&
        createPortal(
          <Giphy giphyRepository={giphyRepository} inputValue={giphyQuery} onClose={closeGiphy} />,
          document.body,
        )}
    </div>
  );

  if (isSidebarVariant && isFocusModeOpen) {
    return createPortal(
      <div className="message-thread-focus-overlay" data-uie-name="message-thread-focus-overlay">
        <div className="message-thread-focus-modal" role="dialog" aria-modal="true" aria-label="Thread focus mode">
          {threadContent}
        </div>
      </div>,
      document.body,
    );
  }

  return threadContent;
};
