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

import {$convertToMarkdownString} from '@lexical/markdown';
import {amplify} from 'amplify';
import cx from 'classnames';
import {LexicalEditor, $createTextNode, $insertNodes, CLEAR_EDITOR_COMMAND} from 'lexical';
import {container} from 'tsyringe';

import {WebAppEvents} from '@wireapp/webapp-events';

import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import {ConversationClassifiedBar} from 'Components/ClassifiedBar/ClassifiedBar';
import {checkFileSharingPermission} from 'Components/Conversation/utils/checkFileSharingPermission';
import {EmojiPicker} from 'Components/EmojiPicker/EmojiPicker';
import {markdownTransformers} from 'Components/InputBar/components/RichTextEditor/utils/markdownTransformers';
import {transformMessage} from 'Components/InputBar/components/RichTextEditor/utils/transformMessage';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {showWarningModal} from 'Components/Modals/utils/showWarningModal';
import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {useUserPropertyValue} from 'src/script/hooks/useUserProperty';
import {PropertiesRepository} from 'src/script/properties/PropertiesRepository';
import {PROPERTIES_TYPE} from 'src/script/properties/PropertiesType';
import {EventName} from 'src/script/tracking/EventName';
import {CONVERSATION_TYPING_INDICATOR_MODE} from 'src/script/user/TypingIndicatorMode';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {KEY} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {sanitizeMarkdown} from 'Util/MarkdownUtil';
import {formatLocale, TIME_IN_MILLIS} from 'Util/TimeUtil';
import {getFileExtension} from 'Util/util';

import {ControlButtons} from './components/InputBarControls/ControlButtons';
import {PastedFileControls} from './components/PastedFileControls/PastedFileControls';
import {ReplyBar} from './components/ReplyBar/ReplyBar';
import {RichTextContent, RichTextEditor} from './components/RichTextEditor';
import {SendMessageButton} from './components/RichTextEditor/components/SendMessageButton';
import {TypingIndicator} from './components/TypingIndicator/TypingIndicator';
import {useEmojiPicker} from './hooks/useEmojiPicker/useEmojiPicker';
import {useFilePaste} from './hooks/useFilePaste/useFilePaste';
import {useFormatToolbar} from './hooks/useFormatToolbar/useFormatToolbar';
import {useTypingIndicator} from './hooks/useTypingIndicator/useTypingIndicator';
import {handleClickOutsideOfInputBar, IgnoreOutsideClickWrapper} from './util/clickHandlers';
import {loadDraftState, saveDraftState} from './util/DraftStateUtil';

import {Config} from '../../Config';
import {ConversationVerificationState} from '../../conversation/ConversationVerificationState';
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
  const {connection, localMessageTimer, messageTimer, hasGlobalMessageTimer, isSelfUserRemoved, is1to1} =
    useKoSubscribableChildren(conversation, [
      'connection',
      'localMessageTimer',
      'messageTimer',
      'hasGlobalMessageTimer',
      'isSelfUserRemoved',
      'is1to1',
    ]);
  const {isOutgoingRequest, isIncomingRequest} = useKoSubscribableChildren(connection!, [
    'isOutgoingRequest',
    'isIncomingRequest',
  ]);

  const wrapperRef = useRef<HTMLDivElement>(null);

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

  const formatToolbar = useFormatToolbar();

  const emojiPicker = useEmojiPicker({
    wrapperRef,
    onEmojiPicked: emoji => {
      editorRef.current?.update(() => {
        $insertNodes([$createTextNode(emoji)]);
      });
      amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.INPUT.EMOJI_MODAL.EMOJI_PICKED);
    },
  });

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
  const isTypingRef = useRef(false);

  const isMessageFormatButtonsFlagEnabled = CONFIG.FEATURE.ENABLE_MESSAGE_FORMAT_BUTTONS;

  const showGiphyButton = isMessageFormatButtonsFlagEnabled
    ? textValue.length > 0
    : textValue.length > 0 && textValue.length <= CONFIG.GIPHY_TEXT_LENGTH;

  const shouldReplaceEmoji = useUserPropertyValue<boolean>(
    () => propertiesRepository.getPreference(PROPERTIES_TYPE.EMOJI.REPLACE_INLINE),
    WebAppEvents.PROPERTIES.UPDATE.EMOJI.REPLACE_INLINE,
  );

  // Mentions
  const getMentionCandidates = (search?: string | null) => {
    const candidates = conversation.participating_user_ets().filter(userEntity => !userEntity.isService);
    return typeof search === 'string' ? searchRepository.searchUserInSet(search, candidates) : candidates;
  };

  useTypingIndicator({
    isEnabled: isTypingIndicatorEnabled,
    text: textValue,
    onTypingChange: useCallback(
      isTyping => {
        isTypingRef.current = isTyping;
        if (isTyping) {
          void conversationRepository.sendTypingStart(conversation);
        } else {
          void conversationRepository.sendTypingStop(conversation);
        }
      },
      [conversationRepository, conversation],
    ),
  });

  const handleSaveEditorDraft = (replyId = '') => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    editor.getEditorState().read(() => {
      const markdown = $convertToMarkdownString(markdownTransformers, undefined, true);
      void saveDraft(
        JSON.stringify(editor.getEditorState().toJSON()),
        transformMessage({replaceEmojis: shouldReplaceEmoji, markdown}),
        replyId,
      );
    });
  };

  const resetDraftState = () => {
    setReplyMessageEntity(null);
    editorRef.current?.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
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
    handleSaveEditorDraft();

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

  const cancelMessageEditing = (resetDraft = true) => {
    setEditedMessage(undefined);
    setReplyMessageEntity(null);

    if (resetDraft) {
      resetDraftState();
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
      handleSaveEditorDraft(messageEntity.id);

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
        t('modalConversationMessageTooLongMessage', {number: CONFIG.MAXIMUM_MESSAGE_LENGTH}),
      );

      return;
    }

    if (isEditing) {
      void sendMessageEdit(text, mentions);
    } else {
      sendTextMessage(text, mentions);
    }

    editorRef.current?.focus();
    resetDraftState();
  };

  const handleSendMessage = async () => {
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
    const fileName = `${t('conversationSendPastedFile', {date})}.${getFileExtension(pastedFile.name)}`;

    const newFile = new File([pastedFile], fileName, {
      type: pastedFile.type,
    });

    setPastedFile(newFile);
  };

  const sendGiphy = (gifUrl: string, tag: string): void => {
    void generateQuote().then(quoteEntity => {
      void messageRepository.sendGif(conversation, gifUrl, tag, quoteEntity);
      cancelMessageEditing(true);
    });
  };

  useEffect(() => {
    amplify.subscribe(WebAppEvents.CONVERSATION.IMAGE.SEND, uploadImages);
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.REPLY, replyMessage);
    amplify.subscribe(WebAppEvents.EXTENSIONS.GIPHY.SEND, sendGiphy);
    amplify.subscribe(WebAppEvents.SHORTCUT.PING, onPingClick);
    conversation.isTextInputReady(true);

    return () => {
      amplify.unsubscribeAll(WebAppEvents.SHORTCUT.PING);
      amplify.unsubscribeAll(WebAppEvents.CONVERSATION.IMAGE.SEND);
      amplify.unsubscribeAll(WebAppEvents.CONVERSATION.MESSAGE.REPLY);
      amplify.unsubscribeAll(WebAppEvents.EXTENSIONS.GIPHY.SEND);
      conversation.isTextInputReady(false);
    };
  }, []);

  const saveDraft = async (editorState: string, plainMessage: string, replyId?: string) => {
    await saveDraftState({
      storageRepository,
      conversation,
      editorState,
      plainMessage: sanitizeMarkdown(plainMessage),
      replyId: replyId ?? replyMessageEntity?.id,
      editedMessageId: editedMessage?.id,
    });
  };

  const loadDraft = async () => {
    const draftState = await loadDraftState(conversation, storageRepository, messageRepository);

    const reply = draftState.messageReply;
    if (reply?.isReplyable()) {
      setReplyMessageEntity(reply);
    }

    const editedMessage = draftState.editedMessage;
    if (editedMessage) {
      setEditedMessage(editedMessage);
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

  const showMarkdownPreview = useUserPropertyValue<boolean>(
    () => propertiesRepository.getPreference(PROPERTIES_TYPE.INTERFACE.MARKDOWN_PREVIEW),
    WebAppEvents.PROPERTIES.UPDATE.INTERFACE.MARKDOWN_PREVIEW,
  );

  const controlButtonsProps = {
    conversation: conversation,
    disableFilesharing: !isFileSharingSendingEnabled,
    disablePing: pingDisabled,
    input: textValue,
    isEditing: isEditing,
    onCancelEditing: () => cancelMessageEditing(true),
    onClickPing: onPingClick,
    onGifClick: onGifClick,
    onSelectFiles: uploadFiles,
    onSelectImages: uploadImages,
    showGiphyButton: showGiphyButton,
    showFormatButton: isMessageFormatButtonsFlagEnabled && showMarkdownPreview,
    showEmojiButton: isMessageFormatButtonsFlagEnabled,
    isFormatActive: formatToolbar.open,
    onFormatClick: formatToolbar.handleClick,
    isEmojiActive: emojiPicker.open,
    onEmojiClick: emojiPicker.handleToggle,
  };

  const enableSending = textValue.length > 0;

  const showAvatar = !!textValue.length;

  return (
    <div ref={wrapperRef}>
      <IgnoreOutsideClickWrapper
        id={conversationInputBarClassName}
        className={cx(conversationInputBarClassName, {'is-right-panel-open': isRightSidebarOpen})}
        aria-live="assertive"
      >
        {isTypingIndicatorEnabled && <TypingIndicator conversationId={conversation.id} />}

        {classifiedDomains && !isConnectionRequest && (
          <ConversationClassifiedBar conversation={conversation} classifiedDomains={classifiedDomains} />
        )}

        {isReplying && !isEditing && (
          <ReplyBar replyMessageEntity={replyMessageEntity} onCancel={() => cancelMessageReply(false)} />
        )}

        <div
          className={cx(`${conversationInputBarClassName}__input input-bar-container`, {
            [`${conversationInputBarClassName}__input--editing`]: isEditing,
            'input-bar-container--with-toolbar': formatToolbar.open && showMarkdownPreview,
          })}
        >
          {!isOutgoingRequest && (
            <>
              <div className="input-bar-avatar">
                {showAvatar && (
                  <Avatar
                    className="cursor-default"
                    participant={selfUser}
                    avatarSize={AVATAR_SIZE.X_SMALL}
                    hideAvailabilityStatus
                  />
                )}
              </div>
              {!isSelfUserRemoved && !pastedFile && (
                <RichTextEditor
                  onSetup={lexical => {
                    editorRef.current = lexical;
                  }}
                  editedMessage={editedMessage}
                  onEscape={() => {
                    if (editedMessage) {
                      cancelMessageEditing(true);
                    } else if (replyMessageEntity) {
                      cancelMessageReply();
                    }
                  }}
                  onArrowUp={() => {
                    if (textValue.length === 0) {
                      editMessage(conversation.getLastEditableMessage());
                    }
                  }}
                  getMentionCandidates={getMentionCandidates}
                  replaceEmojis={shouldReplaceEmoji}
                  placeholder={inputPlaceholder}
                  onUpdate={setMessageContent}
                  hasLocalEphemeralTimer={hasLocalEphemeralTimer}
                  showFormatToolbar={formatToolbar.open}
                  showMarkdownPreview={showMarkdownPreview}
                  saveDraftState={saveDraft}
                  loadDraftState={loadDraft}
                  onShiftTab={onShiftTab}
                  onSend={handleSendMessage}
                  onBlur={() => isTypingRef.current && conversationRepository.sendTypingStop(conversation)}
                >
                  <div className="input-bar-buttons">
                    <ul className="input-bar-controls">
                      <ControlButtons {...controlButtonsProps} showGiphyButton={showGiphyButton} />
                    </ul>
                    <SendMessageButton
                      disabled={!enableSending}
                      onSend={handleSendMessage}
                      className="input-bar-buttons__send"
                    />
                  </div>
                </RichTextEditor>
              )}
            </>
          )}

          {pastedFile && (
            <PastedFileControls pastedFile={pastedFile} onClear={clearPastedFile} onSend={sendPastedFile} />
          )}
        </div>
      </IgnoreOutsideClickWrapper>
      {emojiPicker.open ? (
        <EmojiPicker
          posX={emojiPicker.position.x}
          posY={emojiPicker.position.y}
          onKeyPress={emojiPicker.handleClose}
          resetActionMenuStates={emojiPicker.handleClose}
          wrapperRef={emojiPicker.ref}
          handleReactionClick={emojiPicker.handlePick}
        />
      ) : null}
    </div>
  );
};
