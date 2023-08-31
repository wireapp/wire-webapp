/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {useCallback, useEffect, useRef, useState} from 'react';

import {amplify} from 'amplify';
import cx from 'classnames';
import {$getRoot, LexicalEditor} from 'lexical';
import {container} from 'tsyringe';

import {useMatchMedia} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import {checkFileSharingPermission} from 'Components/Conversation/utils/checkFileSharingPermission';
import {ConversationClassifiedBar} from 'Components/input/ClassifiedBar';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {showWarningModal} from 'Components/Modals/utils/showWarningModal';
import {RichTextContent, RichTextEditor} from 'Components/RichTextEditor';
import {SendMessageButton} from 'Components/RichTextEditor/components/SendMessageButton';
import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {PropertiesRepository} from 'src/script/properties/PropertiesRepository';
import {CONVERSATION_TYPING_INDICATOR_MODE} from 'src/script/user/TypingIndicatorMode';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {KEY} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {formatLocale, TIME_IN_MILLIS} from 'Util/TimeUtil';
import {getFileExtension} from 'Util/util';

import {ControlButtons} from './components/InputBarControls/ControlButtons';
import {GiphyButton} from './components/InputBarControls/GiphyButton';
import {PastedFileControls} from './components/PastedFileControls';
import {ReplyBar} from './components/ReplyBar';
import {TypingIndicator} from './components/TypingIndicator/TypingIndicator';
import {useFilePaste} from './hooks/useFilePaste';
import {useTypingIndicator} from './hooks/useTypingIndicator';
import {handleClickOutsideOfInputBar, IgnoreOutsideClickWrapper} from './util/clickHandlers';
import {loadDraftState, saveDraftState} from './util/DraftStateUtil';

import {Config} from '../../Config';
import {MessageRepository, OutgoingQuote} from '../../conversation/MessageRepository';
import {Conversation} from '../../entity/Conversation';
import {ContentMessage} from '../../entity/message/ContentMessage';
import {User} from '../../entity/User';
import {ConversationError} from '../../error/ConversationError';
import {EventRepository} from '../../event/EventRepository';
import {MentionEntity} from '../../message/MentionEntity';
import {MessageHasher} from '../../message/MessageHasher';
import {QuoteEntity} from '../../message/QuoteEntity';
import {useAppMainState} from '../../page/state';
import {SearchRepository} from '../../search/SearchRepository';
import {StorageRepository} from '../../storage';
import {TeamState} from '../../team/TeamState';

const CONFIG = {
  ...Config.getConfig(),
  PING_TIMEOUT: TIME_IN_MILLIS.SECOND * 2,
};

const config = {
  GIPHY_TEXT_LENGTH: 256,
};

interface InputBarProps {
  readonly conversation: Conversation;
  readonly conversationRepository: ConversationRepository;
  readonly eventRepository: EventRepository;
  readonly messageRepository: MessageRepository;
  readonly openGiphy: (inputValue: string) => void;
  readonly propertiesRepository: PropertiesRepository;
  readonly searchRepository: SearchRepository;
  readonly storageRepository: StorageRepository;
  readonly teamState: TeamState;
  readonly selfUser: User;
  onShiftTab: () => void;
  uploadDroppedFiles: (droppedFiles: File[]) => void;
  uploadImages: (images: File[]) => void;
  uploadFiles: (files: File[]) => void;
}

const conversationInputBarClassName = 'conversation-input-bar';

export const InputBar = ({
  conversation,
  conversationRepository,
  eventRepository,
  messageRepository,
  openGiphy,
  propertiesRepository,
  searchRepository,
  storageRepository,
  selfUser,
  teamState = container.resolve(TeamState),
  onShiftTab,
  uploadDroppedFiles,
  uploadImages,
  uploadFiles,
}: InputBarProps) => {
  const {classifiedDomains, isSelfDeletingMessagesEnabled, isFileSharingSendingEnabled} = useKoSubscribableChildren(
    teamState,
    ['classifiedDomains', 'isSelfDeletingMessagesEnabled', 'isFileSharingSendingEnabled'],
  );
  const {
    connection,
    localMessageTimer,
    messageTimer,
    hasGlobalMessageTimer,
    removed_from_conversation: removedFromConversation,
    is1to1,
  } = useKoSubscribableChildren(conversation, [
    'connection',
    'localMessageTimer',
    'messageTimer',
    'hasGlobalMessageTimer',
    'removed_from_conversation',
    'is1to1',
  ]);
  const {isOutgoingRequest, isIncomingRequest} = useKoSubscribableChildren(connection, [
    'isOutgoingRequest',
    'isIncomingRequest',
  ]);

  // Lexical
  const editorRef = useRef<LexicalEditor | null>(null);

  // Typing indicator
  const {typingIndicatorMode} = useKoSubscribableChildren(propertiesRepository, ['typingIndicatorMode']);
  const isTypingIndicatorEnabled = typingIndicatorMode === CONVERSATION_TYPING_INDICATOR_MODE.ON;

  // Message
  /** the messageContent represents the message being edited. It's directly derived from the editor state */
  const [messageContent, setMessageContent] = useState<RichTextContent>({text: ''});
  const [editedMessage, setEditedMessage] = useState<ContentMessage | undefined>();
  const [replyMessageEntity, setReplyMessageEntity] = useState<ContentMessage | null>(null);
  const textValue = messageContent.text;

  // Files
  const [pastedFile, setPastedFile] = useState<File | null>(null);

  // Common
  const [pingDisabled, setIsPingDisabled] = useState<boolean>(false);

  // Right sidebar
  const {rightSidebar} = useAppMainState.getState();
  const lastItem = rightSidebar.history.length - 1;
  const currentState = rightSidebar.history[lastItem];
  const isRightSidebarOpen = !!currentState;

  const inputPlaceholder = messageTimer ? t('tooltipConversationEphemeral') : t('tooltipConversationInputPlaceholder');

  const isEditing = !!editedMessage;
  const isReplying = !!replyMessageEntity;
  const isConnectionRequest = isOutgoingRequest || isIncomingRequest;
  const hasLocalEphemeralTimer = isSelfDeletingMessagesEnabled && !!localMessageTimer && !hasGlobalMessageTimer;

  // To be changed when design chooses a breakpoint, the conditional can be integrated to the ui-kit directly
  const isScaledDown = useMatchMedia('max-width: 768px');

  const showGiphyButton = messageContent.text.length > 0 && messageContent.text.length <= config.GIPHY_TEXT_LENGTH;

  // Mentions
  const getMentionCandidates = (search?: string | null) => {
    const candidates = conversation.participating_user_ets().filter(userEntity => !userEntity.isService);
    return typeof search === 'string' ? searchRepository.searchUserInSet(search, candidates) : candidates;
  };

  useTypingIndicator({
    isEnabled: isTypingIndicatorEnabled,
    text: messageContent.text,
    onTypingChange: useCallback(
      isTyping => {
        if (isTyping) {
          void conversationRepository.sendTypingStart(conversation);
        } else {
          void conversationRepository.sendTypingStop(conversation);
        }
      },
      [conversationRepository, conversation],
    ),
  });

  const resetDraftState = (resetInputValue = false) => {
    if (resetInputValue) {
      editorRef.current?.update(() => {
        $getRoot().clear();
      });
    }
  };

  const clearPastedFile = () => setPastedFile(null);

  const sendPastedFile = () => {
    if (pastedFile) {
      uploadDroppedFiles([pastedFile]);
      clearPastedFile();
    }
  };

  const cancelMessageReply = (resetDraft = true) => {
    setReplyMessageEntity(null);

    if (resetDraft) {
      resetDraftState();
    }
  };

  useEffect(() => {
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.EDIT, (messageEntity: ContentMessage) => {
      editMessage(messageEntity);
    });

    return () => {
      amplify.unsubscribeAll(WebAppEvents.CONVERSATION.MESSAGE.EDIT);
    };
  });

  const cancelMessageEditing = (resetDraft = true, resetInputValue = false) => {
    setEditedMessage(undefined);
    setReplyMessageEntity(null);

    if (resetDraft) {
      resetDraftState(resetInputValue);
    }
  };

  const handleCancelReply = () => {
    cancelMessageReply(false);
  };

  const editMessage = (messageEntity?: ContentMessage) => {
    if (messageEntity?.isEditable() && messageEntity !== editedMessage && textValue.length === 0) {
      cancelMessageReply();
      cancelMessageEditing(true, true);
      setEditedMessage(messageEntity);

      if (messageEntity.quote() && conversation) {
        void messageRepository
          .getMessageInConversationById(conversation, messageEntity.quote().messageId)
          .then(quotedMessage => setReplyMessageEntity(quotedMessage));
      }
    }
  };

  const replyMessage = (messageEntity: ContentMessage): void => {
    if (messageEntity?.isReplyable() && messageEntity !== replyMessageEntity) {
      cancelMessageReply(false);
      cancelMessageEditing(!!editedMessage);
      setReplyMessageEntity(messageEntity);

      editorRef.current?.focus();
    }
  };

  const generateQuote = (): Promise<OutgoingQuote | undefined> => {
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
  };

  const sendMessageEdit = (messageText: string, mentions: MentionEntity[]): void | Promise<any> => {
    const mentionEntities = mentions.slice(0);
    cancelMessageEditing(true, true);

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

  const sendMessage = (): void => {
    if (pastedFile) {
      return void sendPastedFile();
    }

    const messageTrimmedStart = textValue.trimStart();
    const text = messageTrimmedStart.trimEnd();
    const isMessageTextTooLong = text.length > CONFIG.MAXIMUM_MESSAGE_LENGTH;
    const mentions = messageContent.mentions ?? [];

    if (isMessageTextTooLong) {
      showWarningModal(
        t('modalConversationMessageTooLongHeadline'),
        t('modalConversationMessageTooLongMessage', CONFIG.MAXIMUM_MESSAGE_LENGTH),
      );

      return;
    }

    if (isEditing) {
      void sendMessageEdit(text, mentions);
    } else {
      sendTextMessage(text, mentions);
    }

    editorRef.current?.focus();
    editorRef.current?.update(() => $getRoot().clear());
  };

  const onGifClick = () => openGiphy(textValue);

  const pingConversation = () => {
    setIsPingDisabled(true);
    void messageRepository.sendPing(conversation).then(() => {
      window.setTimeout(() => setIsPingDisabled(false), CONFIG.PING_TIMEOUT);
    });
  };

  const onPingClick = () => {
    if (pingDisabled) {
      return;
    }

    const totalConversationUsers = conversation.participating_user_ets().length;
    if (
      !CONFIG.FEATURE.ENABLE_PING_CONFIRMATION ||
      is1to1 ||
      totalConversationUsers < CONFIG.FEATURE.MAX_USERS_TO_PING_WITHOUT_ALERT
    ) {
      pingConversation();
    } else {
      PrimaryModal.show(PrimaryModal.type.CONFIRM, {
        primaryAction: {
          action: pingConversation,
          text: t('tooltipConversationPing'),
        },
        text: {
          title: t('conversationPingConfirmTitle', {memberCount: totalConversationUsers.toString()}),
        },
      });
    }
  };

  const handlePasteFiles = (files: FileList): void => {
    const [pastedFile] = files;

    if (!pastedFile) {
      return;
    }
    const {lastModified} = pastedFile;

    const date = formatLocale(lastModified || new Date(), 'PP, pp');
    const fileName = `${t('conversationSendPastedFile', date)}.${getFileExtension(pastedFile.name)}`;

    const newFile = new File([pastedFile], fileName, {
      type: pastedFile.type,
    });

    setPastedFile(newFile);
  };

  const sendGiphy = (gifUrl: string, tag: string): void => {
    void generateQuote().then(quoteEntity => {
      void messageRepository.sendGif(conversation, gifUrl, tag, quoteEntity);
      cancelMessageEditing(true, true);
    });
  };

  const onWindowClick = (event: Event): void =>
    handleClickOutsideOfInputBar(event, () => {
      cancelMessageEditing(true, true);
      cancelMessageReply();
    });

  useEffect(() => {
    amplify.subscribe(WebAppEvents.CONVERSATION.IMAGE.SEND, uploadImages);
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.REPLY, replyMessage);
    amplify.subscribe(WebAppEvents.EXTENSIONS.GIPHY.SEND, sendGiphy);
    amplify.subscribe(WebAppEvents.SHORTCUT.PING, onPingClick);

    return () => {
      amplify.unsubscribeAll(WebAppEvents.SHORTCUT.PING);
      amplify.unsubscribeAll(WebAppEvents.CONVERSATION.IMAGE.SEND);
      amplify.unsubscribeAll(WebAppEvents.CONVERSATION.MESSAGE.REPLY);
      amplify.unsubscribeAll(WebAppEvents.EXTENSIONS.GIPHY.SEND);
    };
  }, []);

  const saveDraft = async (editorState: string) => {
    await saveDraftState(storageRepository, conversation, editorState, replyMessageEntity?.id);
  };

  const loadDraft = async () => {
    const draftState = await loadDraftState(conversation, storageRepository, messageRepository);

    if (draftState.messageReply) {
      void draftState.messageReply.then(replyEntity => {
        if (replyEntity?.isReplyable()) {
          setReplyMessageEntity(replyEntity);
        }
      });
    }

    return draftState;
  };

  const handleRepliedMessageDeleted = (messageId: string) => {
    if (replyMessageEntity?.id === messageId) {
      setReplyMessageEntity(null);
    }
  };

  const handleRepliedMessageUpdated = (originalMessageId: string, messageEntity: ContentMessage) => {
    if (replyMessageEntity?.id === originalMessageId) {
      setReplyMessageEntity(messageEntity);
    }
  };

  useEffect(() => {
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, handleRepliedMessageDeleted);
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.UPDATED, handleRepliedMessageUpdated);

    return () => {
      amplify.unsubscribe(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, handleRepliedMessageDeleted);
      amplify.unsubscribe(WebAppEvents.CONVERSATION.MESSAGE.UPDATED, handleRepliedMessageUpdated);
    };
  }, [replyMessageEntity]);

  useEffect(() => {
    if (isEditing) {
      window.addEventListener('click', onWindowClick);

      return () => {
        window.removeEventListener('click', onWindowClick);
      };
    }

    return () => undefined;
  }, [isEditing]);

  useFilePaste(checkFileSharingPermission(handlePasteFiles));

  const sendImageOnEnterClick = (event: KeyboardEvent) => {
    if (event.key === KEY.ENTER && !event.shiftKey && !event.altKey && !event.metaKey) {
      sendPastedFile();
    }
  };

  useEffect(() => {
    if (!pastedFile) {
      return () => undefined;
    }

    window.addEventListener('keydown', sendImageOnEnterClick);

    return () => {
      window.removeEventListener('keydown', sendImageOnEnterClick);
    };
  }, [pastedFile]);

  const controlButtonsProps = {
    conversation: conversation,
    disableFilesharing: !isFileSharingSendingEnabled,
    disablePing: pingDisabled,
    input: textValue,
    isEditing: isEditing,
    isScaledDown: isScaledDown,
    onCancelEditing: () => cancelMessageEditing(true, true),
    onClickPing: onPingClick,
    onGifClick: onGifClick,
    onSelectFiles: uploadFiles,
    onSelectImages: uploadImages,
    showGiphyButton: showGiphyButton,
  };

  const enableSending = textValue.length > 0;

  return (
    <IgnoreOutsideClickWrapper
      id={conversationInputBarClassName}
      className={cx(conversationInputBarClassName, {'is-right-panel-open': isRightSidebarOpen})}
      aria-live="assertive"
    >
      {isTypingIndicatorEnabled && <TypingIndicator conversationId={conversation.id} />}

      {classifiedDomains && !isConnectionRequest && (
        <ConversationClassifiedBar conversation={conversation} classifiedDomains={classifiedDomains} />
      )}

      {isReplying && !isEditing && <ReplyBar replyMessageEntity={replyMessageEntity} onCancel={handleCancelReply} />}

      <div
        className={cx(`${conversationInputBarClassName}__input`, {
          [`${conversationInputBarClassName}__input--editing`]: isEditing,
        })}
      >
        {!isOutgoingRequest && (
          <>
            <div className="controls-left">
              {!!textValue.length && (
                <Avatar className="cursor-default" participant={selfUser} avatarSize={AVATAR_SIZE.X_SMALL} />
              )}
            </div>

            {!removedFromConversation && !pastedFile && (
              <RichTextEditor
                onSetup={lexical => {
                  editorRef.current = lexical;
                }}
                editedMessage={editedMessage}
                onCancelMessageEdit={() => cancelMessageEditing(true, true)}
                onEditLastSentMessage={() => editMessage(conversation.getLastEditableMessage())}
                getMentionCandidates={getMentionCandidates}
                propertiesRepository={propertiesRepository}
                placeholder={inputPlaceholder}
                onUpdate={setMessageContent}
                hasLocalEphemeralTimer={hasLocalEphemeralTimer}
                saveDraftState={saveDraft}
                loadDraftState={loadDraft}
                onShiftTab={onShiftTab}
                onSend={sendMessage}
              >
                {isScaledDown ? (
                  <>
                    <ul className="controls-right buttons-group" css={{minWidth: '95px'}}>
                      {showGiphyButton && <GiphyButton onGifClick={onGifClick} />}
                      <SendMessageButton disabled={!enableSending} onSend={sendMessage} />
                    </ul>
                    <ul className="controls-right buttons-group" css={{justifyContent: 'center', width: '100%'}}>
                      <ControlButtons {...controlButtonsProps} isScaledDown={isScaledDown} />
                    </ul>
                  </>
                ) : (
                  <>
                    <ul className="controls-right buttons-group">
                      <ControlButtons {...controlButtonsProps} showGiphyButton={showGiphyButton} />
                      <SendMessageButton disabled={!enableSending} onSend={sendMessage} />
                    </ul>
                  </>
                )}
              </RichTextEditor>
            )}
          </>
        )}

        {pastedFile && <PastedFileControls pastedFile={pastedFile} onClear={clearPastedFile} onSend={sendPastedFile} />}
      </div>
    </IgnoreOutsideClickWrapper>
  );
};
