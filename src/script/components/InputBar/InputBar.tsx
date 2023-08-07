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

import {useEffect, useRef, useState} from 'react';

import {amplify} from 'amplify';
import cx from 'classnames';
import {$createParagraphNode, $createTextNode, $getRoot, $setSelection, LexicalEditor} from 'lexical';
import {container} from 'tsyringe';

import {useMatchMedia} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import {checkFileSharingPermission} from 'Components/Conversation/utils/checkFileSharingPermission';
import {ClassifiedBar} from 'Components/input/ClassifiedBar';
import {SendMessageButton} from 'Components/LexicalInput/components/SendMessageButton';
import {LexicalInput} from 'Components/LexicalInput/LexicalInput';
import {$createMentionNode} from 'Components/LexicalInput/nodes/MentionNode';
import {createNodes} from 'Components/LexicalInput/utils/generateNodes';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {showWarningModal} from 'Components/Modals/utils/showWarningModal';
import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {PropertiesRepository} from 'src/script/properties/PropertiesRepository';
import {CONVERSATION_TYPING_INDICATOR_MODE} from 'src/script/user/TypingIndicatorMode';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {loadDraftState, saveDraftState} from 'Util/DraftStateUtil';
import {KEY} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {formatLocale, TIME_IN_MILLIS} from 'Util/TimeUtil';
import {getFileExtension} from 'Util/util';

import {ControlButtons} from './components/InputBarControls/ControlButtons';
import {GiphyButton} from './components/InputBarControls/GiphyButton';
import {PastedFileControls} from './components/PastedFileControls';
import {ReplyBar} from './components/ReplyBar';
import {TYPING_TIMEOUT} from './components/TypingIndicator';
import {TypingIndicator} from './components/TypingIndicator/TypingIndicator';
import {useFilePaste} from './hooks/useFilePaste';
import {handleClickOutsideOfInputBar, IgnoreOutsideClickWrapper} from './util/clickHandlers';

import {Config} from '../../Config';
import {MessageRepository, OutgoingQuote} from '../../conversation/MessageRepository';
import {Conversation} from '../../entity/Conversation';
import {ContentMessage} from '../../entity/message/ContentMessage';
import {Text as TextAsset} from '../../entity/message/Text';
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
  readonly conversationEntity: Conversation;
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

const InputBar = ({
  conversationEntity,
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
    allUserEntities: allUsers,
    localMessageTimer,
    messageTimer,
    hasGlobalMessageTimer,
    removed_from_conversation: removedFromConversation,
    is1to1,
  } = useKoSubscribableChildren(conversationEntity, [
    'connection',
    'firstUserEntity',
    'allUserEntities',
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
  const lexicalRef = useRef<LexicalEditor>(null);

  // Typing indicator
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const {typingIndicatorMode} = useKoSubscribableChildren(propertiesRepository, ['typingIndicatorMode']);
  const isTypingIndicatorEnabled = typingIndicatorMode === CONVERSATION_TYPING_INDICATOR_MODE.ON;

  // Message
  const [inputValue, setInputValue] = useState<string>('');
  const [editMessageEntity, setEditMessageEntity] = useState<ContentMessage | null>(null);
  const [replyMessageEntity, setReplyMessageEntity] = useState<ContentMessage | null>(null);

  // Mentions
  const [currentMentions, setCurrentMentions] = useState<MentionEntity[]>([]);

  // Files
  const [pastedFile, setPastedFile] = useState<File | null>(null);

  // Common
  const [pingDisabled, setIsPingDisabled] = useState<boolean>(false);
  const hasUserTyped = useRef<boolean>(false);

  // Right sidebar
  const {rightSidebar} = useAppMainState.getState();
  const lastItem = rightSidebar.history.length - 1;
  const currentState = rightSidebar.history[lastItem];
  const isRightSidebarOpen = !!currentState;

  const inputPlaceholder = messageTimer ? t('tooltipConversationEphemeral') : t('tooltipConversationInputPlaceholder');

  const isEditing = !!editMessageEntity;
  const isReplying = !!replyMessageEntity;
  const isConnectionRequest = isOutgoingRequest || isIncomingRequest;
  const hasLocalEphemeralTimer = isSelfDeletingMessagesEnabled && !!localMessageTimer && !hasGlobalMessageTimer;

  // To be changed when design chooses a breakpoint, the conditional can be integrated to the ui-kit directly
  const isScaledDown = useMatchMedia('max-width: 768px');

  const showGiphyButton = inputValue.length > 0 && inputValue.length <= config.GIPHY_TEXT_LENGTH;

  // Mentions
  const {participating_user_ets: participatingUserEts} = useKoSubscribableChildren(conversationEntity, [
    'participating_user_ets',
  ]);
  const mentionCandidates = participatingUserEts.filter(userEntity => !userEntity.isService);

  const resetDraftState = (resetInputValue = false) => {
    setCurrentMentions([]);

    if (resetInputValue) {
      lexicalRef.current?.update(() => {
        $getRoot().clear();
      });

      setInputValue('');
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

  const cancelMessageEditing = (resetDraft = true, resetInputValue = false) => {
    setEditMessageEntity(null);
    setReplyMessageEntity(null);

    if (resetDraft) {
      resetDraftState(resetInputValue);
    }
  };

  const handleCancelReply = () => {
    cancelMessageReply(false);
  };

  const editMessage = (messageEntity: ContentMessage, editor: LexicalEditor) => {
    if (messageEntity?.isEditable() && messageEntity !== editMessageEntity) {
      const firstAsset = messageEntity.getFirstAsset() as TextAsset;
      const newMentions = firstAsset.mentions().slice();

      cancelMessageReply();
      cancelMessageEditing(true, true);
      setEditMessageEntity(messageEntity);
      setInputValue(firstAsset.text);
      setCurrentMentions(newMentions);
      editor.update(() => {
        const nodes = createNodes(newMentions, firstAsset.text);

        const paragraphs = nodes.map(node => {
          if (node.type === 'Mention') {
            return $createMentionNode('@', node.data.slice(1));
          }

          return $createTextNode(node.data);
        });

        const root = $getRoot();
        const paragraphNode = $createParagraphNode();
        paragraphNode.append(...paragraphs);
        root.append(paragraphNode);

        // This behaviour is needed to clear selection, if we not clear selection will be on beginning.
        $setSelection(null);

        editor.focus();
      });

      if (messageEntity.quote() && conversationEntity) {
        void messageRepository
          .getMessageInConversationById(conversationEntity, messageEntity.quote().messageId)
          .then(quotedMessage => setReplyMessageEntity(quotedMessage));
      }
    }
  };

  useEffect(() => {
    if (!hasUserTyped.current || !isTypingIndicatorEnabled) {
      return;
    }

    if (isTyping) {
      void conversationRepository.sendTypingStart(conversationEntity);
    } else {
      void conversationRepository.sendTypingStop(conversationEntity);
    }
  }, [isTyping, conversationRepository, conversationEntity, isTypingIndicatorEnabled]);

  useEffect(() => {
    if (!hasUserTyped.current) {
      return () => {};
    }

    let timerId: number;

    if (inputValue.length > 0) {
      setIsTyping(true);
      timerId = window.setTimeout(() => setIsTyping(false), TYPING_TIMEOUT);
    } else {
      setIsTyping(false);
    }

    return () => window.clearTimeout(timerId);
  }, [inputValue]);

  const replyMessage = (messageEntity: ContentMessage): void => {
    if (messageEntity?.isReplyable() && messageEntity !== replyMessageEntity) {
      cancelMessageReply(false);
      cancelMessageEditing(!!editMessageEntity);
      setReplyMessageEntity(messageEntity);

      lexicalRef.current?.focus();
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

    if (!messageText.length && editMessageEntity) {
      return messageRepository.deleteMessageForEveryone(conversationEntity, editMessageEntity);
    }

    if (editMessageEntity) {
      messageRepository
        .sendMessageEdit(conversationEntity, messageText, editMessageEntity, mentionEntities)
        .catch(error => {
          if (error.type !== ConversationError.TYPE.NO_MESSAGE_CHANGES) {
            throw error;
          }
        });

      cancelMessageReply();
    }
  };

  const sendMessage = (messageText: string, mentions: MentionEntity[]) => {
    if (messageText.length) {
      const mentionEntities = mentions.slice(0);

      void generateQuote().then(quoteEntity => {
        void messageRepository.sendTextWithLinkPreview(conversationEntity, messageText, mentionEntities, quoteEntity);
        cancelMessageReply();
      });
    }
  };

  const onSend = (messageText: string, mentions: MentionEntity[]): void => {
    if (pastedFile) {
      sendPastedFile();
      return;
    }

    const messageTrimmedStart = messageText.trimStart();
    const text = messageTrimmedStart.trimEnd();
    const isMessageTextTooLong = text.length > CONFIG.MAXIMUM_MESSAGE_LENGTH;

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
      sendMessage(text, mentions);
    }

    lexicalRef.current?.focus();
  };

  const onGifClick = () => openGiphy(inputValue);

  const pingConversation = () => {
    setIsPingDisabled(true);
    void messageRepository.sendPing(conversationEntity).then(() => {
      window.setTimeout(() => setIsPingDisabled(false), CONFIG.PING_TIMEOUT);
    });
  };

  const totalConversationUsers = participatingUserEts.length;

  const onPingClick = () => {
    if (conversationEntity && !pingDisabled) {
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
      void messageRepository.sendGif(conversationEntity, gifUrl, tag, quoteEntity);
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

  useEffect(() => {
    hasUserTyped.current = false;
  }, [conversationEntity]);

  const saveDraft = async (editor: string) => {
    await saveDraftState(storageRepository, conversationEntity, editor, replyMessageEntity?.id);
  };

  const loadDraft = async () => {
    clearPastedFile();
    cancelMessageEditing(true, true);
    cancelMessageReply();

    const draftState = await loadDraftState(conversationEntity, storageRepository, messageRepository);

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
    conversation: conversationEntity,
    disableFilesharing: !isFileSharingSendingEnabled,
    disablePing: pingDisabled,
    input: inputValue,
    isEditing: isEditing,
    isScaledDown: isScaledDown,
    onCancelEditing: () => cancelMessageEditing(true, true),
    onClickPing: onPingClick,
    onGifClick: onGifClick,
    onSelectFiles: uploadFiles,
    onSelectImages: uploadImages,
    showGiphyButton: showGiphyButton,
  };

  return (
    <IgnoreOutsideClickWrapper
      id={conversationInputBarClassName}
      className={cx(conversationInputBarClassName, {'is-right-panel-open': isRightSidebarOpen})}
      aria-live="assertive"
    >
      {isTypingIndicatorEnabled && <TypingIndicator conversationId={conversationEntity.id} />}

      {classifiedDomains && !isConnectionRequest && (
        <ClassifiedBar
          conversationDomain={conversationEntity.domain}
          users={allUsers}
          classifiedDomains={classifiedDomains}
        />
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
              {!!inputValue.length && (
                <Avatar className="cursor-default" participant={selfUser} avatarSize={AVATAR_SIZE.X_SMALL} />
              )}
            </div>

            {!removedFromConversation && !pastedFile && (
              <LexicalInput
                ref={lexicalRef}
                editMessage={editMessage}
                mentionCandidates={mentionCandidates}
                propertiesRepository={propertiesRepository}
                searchRepository={searchRepository}
                placeholder={inputPlaceholder}
                inputValue={inputValue}
                setInputValue={setInputValue}
                currentMentions={currentMentions}
                hasLocalEphemeralTimer={hasLocalEphemeralTimer}
                saveDraftState={saveDraft}
                loadDraftState={loadDraft}
                onShiftTab={onShiftTab}
              >
                {isScaledDown ? (
                  <>
                    <ul className="controls-right buttons-group" css={{minWidth: '95px'}}>
                      {showGiphyButton && <GiphyButton onGifClick={onGifClick} />}
                      <SendMessageButton textValue={inputValue} onSend={onSend} mentions={mentionCandidates} />
                    </ul>
                    <ul className="controls-right buttons-group" css={{justifyContent: 'center', width: '100%'}}>
                      <ControlButtons {...controlButtonsProps} isScaledDown={isScaledDown} />
                    </ul>
                  </>
                ) : (
                  <>
                    <ul className="controls-right buttons-group">
                      <ControlButtons {...controlButtonsProps} showGiphyButton={showGiphyButton} />
                      <SendMessageButton textValue={inputValue} onSend={onSend} mentions={mentionCandidates} />
                    </ul>
                  </>
                )}
              </LexicalInput>
            )}
          </>
        )}

        {pastedFile && <PastedFileControls pastedFile={pastedFile} onClear={clearPastedFile} onSend={sendPastedFile} />}
      </div>
    </IgnoreOutsideClickWrapper>
  );
};

export {InputBar};
