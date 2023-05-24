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

import {ChangeEvent, FormEvent, KeyboardEvent as ReactKeyboardEvent, useEffect, useRef, useState} from 'react';

import {amplify} from 'amplify';
import cx from 'classnames';
import {container} from 'tsyringe';

import {useMatchMedia} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import {checkFileSharingPermission} from 'Components/Conversation/utils/checkFileSharingPermission';
import {useEmoji} from 'Components/Emoji/useEmoji';
import {Icon} from 'Components/Icon';
import {ClassifiedBar} from 'Components/input/ClassifiedBar';
import {showWarningModal} from 'Components/Modals/utils/showWarningModal';
import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {PropertiesRepository} from 'src/script/properties/PropertiesRepository';
import {CONVERSATION_TYPING_INDICATOR_MODE} from 'src/script/user/TypingIndicatorMode';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {loadDraftState, saveDraftState} from 'Util/DraftStateUtil';
import {insertAtCaret, isFunctionKey, isTabKey, KEY} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {
  createMentionEntity,
  detectMentionEdgeDeletion,
  getMentionCandidate,
  updateMentionRanges,
} from 'Util/MentionUtil';
import {formatDuration, formatLocale, TIME_IN_MILLIS} from 'Util/TimeUtil';
import {getSelectionPosition} from 'Util/util';

import {ControlButtons} from './components/InputBarControls/ControlButtons';
import {GiphyButton} from './components/InputBarControls/GiphyButton';
import {MentionSuggestionList} from './components/MentionSuggestions';
import {PastedFileControls} from './components/PastedFileControls';
import {ReplyBar} from './components/ReplyBar';
import {TYPING_TIMEOUT} from './components/TypingIndicator';
import {TypingIndicator} from './components/TypingIndicator/TypingIndicator';
import {getRichTextInput} from './getRichTextInput';
import {useFilePaste} from './hooks/useFilePaste';
import {useResizeTarget} from './hooks/useResizeTarget';
import {useScrollSync} from './hooks/useScrollSync';
import {useTextAreaFocus} from './hooks/useTextAreaFocus';
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
    participating_user_ets: participatingUserEts,
    allUserEntities: allUsers,
    localMessageTimer,
    messageTimer,
    hasGlobalMessageTimer,
    removed_from_conversation: removedFromConversation,
  } = useKoSubscribableChildren(conversationEntity, [
    'connection',
    'firstUserEntity',
    'allUserEntities',
    'participating_user_ets',
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

  const {typingIndicatorMode} = useKoSubscribableChildren(propertiesRepository, ['typingIndicatorMode']);
  const isTypingIndicatorEnabled = typingIndicatorMode === CONVERSATION_TYPING_INDICATOR_MODE.ON;
  const shadowInputRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [editMessageEntity, setEditMessageEntity] = useState<ContentMessage | null>(null);
  const [replyMessageEntity, setReplyMessageEntity] = useState<ContentMessage | null>(null);
  const [currentMentions, setCurrentMentions] = useState<MentionEntity[]>([]);
  const [pastedFile, setPastedFile] = useState<File | null>(null);
  const [inputValue, setInputValue] = useState<string>('');
  const [selectionStart, setSelectionStart] = useState<number>(0);
  const [selectionEnd, setSelectionEnd] = useState<number>(0);
  const [pingDisabled, setIsPingDisabled] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const hasUserTyped = useRef<boolean>(false);
  const [editedMention, setEditedMention] = useState<{startIndex: number; term: string} | undefined>(undefined);

  const {rightSidebar} = useAppMainState.getState();
  const lastItem = rightSidebar.history.length - 1;
  const currentState = rightSidebar.history[lastItem];
  const isRightSidebarOpen = !!currentState;

  const inputPlaceholder = messageTimer ? t('tooltipConversationEphemeral') : t('tooltipConversationInputPlaceholder');

  const candidates = participatingUserEts.filter(userEntity => !userEntity.isService);
  const mentionSuggestions = editedMention ? searchRepository.searchUserInSet(editedMention.term, candidates) : [];

  const isEditing = !!editMessageEntity;
  const isReplying = !!replyMessageEntity;
  const isConnectionRequest = isOutgoingRequest || isIncomingRequest;
  const hasLocalEphemeralTimer = isSelfDeletingMessagesEnabled && localMessageTimer && !hasGlobalMessageTimer;

  const richTextInput = getRichTextInput(currentMentions, inputValue);

  // To be changed when design chooses a breakpoint, the conditional can be integrated to the ui-kit directly
  const isScaledDown = useMatchMedia('max-width: 768px');

  const config = {
    GIPHY_TEXT_LENGTH: 256,
  };

  const showGiphyButton = inputValue.length > 0 && inputValue.length <= config.GIPHY_TEXT_LENGTH;

  const updateSelectionState = (updateOnInit = true) => {
    if (!updateOnInit) {
      return;
    }

    if (!textareaRef.current) {
      return;
    }

    const {selectionStart: start, selectionEnd: end} = textareaRef.current;
    const {newEnd, newStart} = getSelectionPosition(textareaRef.current, currentMentions);

    if (newStart !== start || newEnd !== end) {
      textareaRef.current.selectionStart = newStart;
      textareaRef.current.selectionEnd = newEnd;
    }

    setSelectionStart(newStart);
    setSelectionEnd(newEnd);
  };

  const moveCursorToEnd = (endPosition: number, updateSelection = true) => {
    updateSelectionState(updateSelection);
    setTimeout(() => {
      textareaRef.current?.setSelectionRange(endPosition, endPosition);
      textareaRef.current?.focus();
    }, 0);
  };

  const resetDraftState = (resetInputValue = false) => {
    setCurrentMentions([]);

    if (resetInputValue) {
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

  const endMentionFlow = () => {
    setEditedMention(undefined);
    updateSelectionState();
  };

  const addMention = (userEntity: User) => {
    const mentionEntity = createMentionEntity(userEntity, editedMention);

    if (mentionEntity && editedMention) {
      // keep track of what is before and after the mention being edited
      const beforeMentionPartial = inputValue.slice(0, mentionEntity.startIndex);
      const afterMentionPartial = inputValue
        .slice(mentionEntity.startIndex + editedMention.term.length + 1)
        .replace(/^ /, '');

      const newInputValue = `${beforeMentionPartial}@${userEntity.name()} ${afterMentionPartial}`;
      // insert the mention in between
      setInputValue(newInputValue);

      const currentValueLength = newInputValue.length;
      const inputValueLength = inputValue.length;
      const difference = currentValueLength - inputValueLength;

      const updatedMentions = updateMentionRanges(currentMentions, selectionStart, selectionEnd, difference);
      const newMentions = [...updatedMentions, mentionEntity];
      const sortedMentions = newMentions.sort((mentionA, mentionB) => mentionA.startIndex - mentionB.startIndex);
      setCurrentMentions(sortedMentions);

      const caretPosition = mentionEntity.endIndex + 1;

      setEditedMention(undefined);
      setSelectionStart(caretPosition);
      setSelectionEnd(caretPosition);

      // Need to use setTimeout, because the setSelectionRange works asynchronously
      setTimeout(() => {
        textareaRef.current?.setSelectionRange(caretPosition, caretPosition);
        textareaRef.current?.focus();
      }, 0);
    }
  };

  const handleMentionFlow = (event: ReactKeyboardEvent<HTMLTextAreaElement> | FormEvent<HTMLTextAreaElement>) => {
    const {selectionStart: start, selectionEnd: end, value} = event.currentTarget;
    const mentionCandidate = getMentionCandidate(currentMentions, start, end, value);

    setEditedMention(mentionCandidate);
    updateSelectionState();
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
    if (!mentionSuggestions.length) {
      cancelMessageReply(false);
    }

    textareaRef.current?.focus();
  };

  const editMessage = (messageEntity: ContentMessage) => {
    if (messageEntity?.isEditable() && messageEntity !== editMessageEntity) {
      const firstAsset = messageEntity.getFirstAsset() as TextAsset;
      const newMentions = firstAsset.mentions().slice();

      cancelMessageReply();
      cancelMessageEditing(true, true);
      setEditMessageEntity(messageEntity);
      setInputValue(firstAsset.text);
      setCurrentMentions(newMentions);

      if (messageEntity.quote() && conversationEntity) {
        messageRepository
          .getMessageInConversationById(conversationEntity, messageEntity.quote().messageId)
          .then(quotedMessage => setReplyMessageEntity(quotedMessage));
      }
    }
  };

  useEffect(() => {
    if (editMessageEntity?.isEditable()) {
      const firstAsset = editMessageEntity.getFirstAsset() as TextAsset;
      moveCursorToEnd(firstAsset.text.length);
    }
  }, [editMessageEntity]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!hasUserTyped.current || !isTypingIndicatorEnabled) {
      return;
    }
    if (isTyping) {
      conversationRepository.sendTypingStart(conversationEntity);
    } else {
      conversationRepository.sendTypingStop(conversationEntity);
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
    return () => {
      window.clearTimeout(timerId);
    };
  }, [inputValue]);

  const replyMessage = (messageEntity: ContentMessage): void => {
    if (messageEntity?.isReplyable() && messageEntity !== replyMessageEntity) {
      cancelMessageReply(false);
      cancelMessageEditing(!!editMessageEntity);
      setReplyMessageEntity(messageEntity);

      textareaRef.current?.focus();
    }
  };

  const updateMentions = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = event.currentTarget;
    const value = textarea.value;
    const lengthDifference = value.length - inputValue.length;

    const edgeMention = detectMentionEdgeDeletion(
      textarea,
      currentMentions,
      selectionStart,
      selectionEnd,
      lengthDifference,
    );

    if (edgeMention) {
      textarea.value = inputValue;
      textarea.selectionStart = edgeMention.startIndex;
      textarea.selectionEnd = edgeMention.endIndex;
    }
  };

  const onTextAreaKeyDown = (keyboardEvent: ReactKeyboardEvent<HTMLTextAreaElement>): void | boolean => {
    const inputHandledByEmoji = !editedMention && emojiKeyDown(keyboardEvent);
    // shift+tab from message input bar set last focused message's elements non focusable
    if (keyboardEvent.shiftKey && isTabKey(keyboardEvent)) {
      onShiftTab();
    }
    if (!inputHandledByEmoji) {
      switch (keyboardEvent.key) {
        case KEY.ARROW_UP: {
          if (!isFunctionKey(keyboardEvent) && !inputValue.length) {
            editMessage(conversationEntity.getLastEditableMessage() as ContentMessage);
            updateMentions(keyboardEvent);
          }
          break;
        }
        case KEY.ESC: {
          if (mentionSuggestions.length) {
            endMentionFlow();
          } else if (pastedFile) {
            setPastedFile(null);
          } else if (isEditing) {
            cancelMessageEditing(true, true);
          } else if (isReplying) {
            cancelMessageReply(false);
          }
          break;
        }
        case KEY.ENTER: {
          if (!keyboardEvent.shiftKey && !keyboardEvent.altKey && !keyboardEvent.metaKey) {
            keyboardEvent.preventDefault();
            onSend(inputValue);
          }

          if (keyboardEvent.altKey || keyboardEvent.metaKey) {
            if (keyboardEvent.target) {
              keyboardEvent.preventDefault();
              insertAtCaret(keyboardEvent.target.toString(), '\n');
            }
          }

          break;
        }

        default:
          break;
      }

      return true;
    }
  };

  const onTextareaKeyUp = (keyboardEvent: ReactKeyboardEvent<HTMLTextAreaElement>): void => {
    if (!editedMention) {
      emojiKeyUp(keyboardEvent);
    }

    if (keyboardEvent.key !== KEY.ESC) {
      handleMentionFlow(keyboardEvent);
    }
  };

  const onChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    event.preventDefault();

    const {value: currentValue} = event.currentTarget;
    hasUserTyped.current = true;
    setInputValue(currentValue);
    const currentValueLength = currentValue.length;
    const previousValueLength = inputValue.length;
    const difference = currentValueLength - previousValueLength;

    const updatedMentions = updateMentionRanges(currentMentions, selectionStart, selectionEnd, difference);
    setCurrentMentions(updatedMentions);
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

  const sendMessage = (messageText: string, mentions: MentionEntity[]) => {
    if (messageText.length) {
      const mentionEntities = mentions.slice(0);

      generateQuote().then(quoteEntity => {
        messageRepository.sendTextWithLinkPreview(conversationEntity, messageText, mentionEntities, quoteEntity);
        cancelMessageReply();
      });
    }
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

  const onSend = (text: string): void | boolean => {
    if (pastedFile) {
      return sendPastedFile();
    }

    const beforeLength = text.length;
    const messageTrimmedStart = text.trimLeft();
    const trimmedStartLength = messageTrimmedStart.length;
    const messageText = messageTrimmedStart.trimRight();
    const isMessageTextTooLong = messageText.length > CONFIG.MAXIMUM_MESSAGE_LENGTH;

    if (isMessageTextTooLong) {
      showWarningModal(
        t('modalConversationMessageTooLongHeadline'),
        t('modalConversationMessageTooLongMessage', CONFIG.MAXIMUM_MESSAGE_LENGTH),
      );

      return;
    }

    const updatedMentions = updateMentionRanges(currentMentions, 0, 0, trimmedStartLength - beforeLength);

    if (isEditing) {
      sendMessageEdit(messageText, updatedMentions);
    } else {
      sendMessage(messageText, updatedMentions);
    }
    /*
      When trying to update a textarea with japanese value to
      empty in onKeyDown handler the text is not fully cleared
      and some parts of text is pasted by the OS/Browser after
      we do setInputValue('');
      To fix this we have to add a setTimeout in order to postpone
      the operation of clearing the text to after of the proccess
      of the onKeyDown and onKeyUp DOM events.
    */
    setTimeout(() => {
      resetDraftState(true);
    }, 0);
    textareaRef.current?.focus();
  };

  const {
    onInputKeyDown: emojiKeyDown,
    onInputKeyUp: emojiKeyUp,
    renderEmojiComponent,
  } = useEmoji(propertiesRepository, setInputValue, onSend, currentMentions, setCurrentMentions, textareaRef.current);

  const onGifClick = () => openGiphy(inputValue);

  const onPingClick = () => {
    if (conversationEntity && !pingDisabled) {
      setIsPingDisabled(true);

      messageRepository.sendPing(conversationEntity).then(() => {
        window.setTimeout(() => setIsPingDisabled(false), CONFIG.PING_TIMEOUT);
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
    const fileName = t('conversationSendPastedFile', date);

    const newFile = new File([pastedFile], fileName, {
      type: pastedFile.type,
    });

    setPastedFile(newFile);
  };

  const loadInitialStateForConversation = async (): Promise<void> => {
    setPastedFile(null);
    cancelMessageEditing(true, true);
    cancelMessageReply();
    endMentionFlow();

    if (conversationEntity) {
      const previousSessionData = await loadDraftState(conversationEntity, storageRepository, messageRepository);

      if (previousSessionData?.text) {
        setInputValue(previousSessionData.text);

        setSelectionStart(previousSessionData.text.length);
        setSelectionEnd(previousSessionData.text.length);
      }

      if (previousSessionData?.mentions.length > 0) {
        setCurrentMentions(previousSessionData.mentions);
      }

      if (previousSessionData.replyEntityPromise) {
        previousSessionData.replyEntityPromise.then(replyEntity => {
          if (replyEntity?.isReplyable()) {
            setReplyMessageEntity(replyEntity);
          }
        });
      }

      moveCursorToEnd(previousSessionData.text.length, false);
    }
  };

  const sendGiphy = (gifUrl: string, tag: string): void => {
    generateQuote().then(quoteEntity => {
      messageRepository.sendGif(conversationEntity, gifUrl, tag, quoteEntity);
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
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.EDIT, editMessage);
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.REPLY, replyMessage);
    amplify.subscribe(WebAppEvents.EXTENSIONS.GIPHY.SEND, sendGiphy);
    amplify.subscribe(WebAppEvents.SHORTCUT.PING, onPingClick);

    return () => {
      amplify.unsubscribeAll(WebAppEvents.SHORTCUT.PING);
      amplify.unsubscribeAll(WebAppEvents.CONVERSATION.IMAGE.SEND);
      amplify.unsubscribeAll(WebAppEvents.CONVERSATION.MESSAGE.EDIT);
      amplify.unsubscribeAll(WebAppEvents.CONVERSATION.MESSAGE.REPLY);
      amplify.unsubscribeAll(WebAppEvents.EXTENSIONS.GIPHY.SEND);
    };
  }, []);

  useEffect(() => {
    hasUserTyped.current = false;
    loadInitialStateForConversation();
  }, [conversationEntity]);

  useEffect(() => {
    if (!isEditing) {
      saveDraftState(storageRepository, conversationEntity, {
        mentions: currentMentions,
        text: inputValue,
        ...(replyMessageEntity && {reply: replyMessageEntity}),
      });
    }
  }, [isEditing, currentMentions, replyMessageEntity, inputValue]);

  useTextAreaFocus(() => textareaRef.current?.focus());

  useScrollSync(textareaRef.current, shadowInputRef.current, [
    textareaRef.current,
    shadowInputRef.current,
    richTextInput,
  ]);

  useResizeTarget(shadowInputRef.current, textareaRef.current, [
    textareaRef.current,
    shadowInputRef.current,
    richTextInput,
  ]);

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

  const sendButton = (
    <li>
      <button
        type="button"
        className={cx('controls-right-button controls-right-button--send')}
        disabled={inputValue.length === 0}
        title={t('tooltipConversationSendMessage')}
        aria-label={t('tooltipConversationSendMessage')}
        onClick={() => onSend(inputValue)}
        data-uie-name="do-send-message"
      >
        <Icon.Send />
      </button>
    </li>
  );

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
      {!!isTypingIndicatorEnabled && <TypingIndicator conversationId={conversationEntity.id} />}

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
              <>
                {renderEmojiComponent()}

                <div className="controls-center">
                  <textarea
                    ref={textareaRef}
                    id={`${conversationInputBarClassName}-text`}
                    className={cx(`${conversationInputBarClassName}-text`, {
                      [`${conversationInputBarClassName}-text--accent`]: hasLocalEphemeralTimer,
                    })}
                    onKeyDown={onTextAreaKeyDown}
                    onKeyUp={onTextareaKeyUp}
                    onClick={handleMentionFlow}
                    onInput={updateMentions}
                    onChange={onChange}
                    onBlur={() => setIsTyping(false)}
                    value={inputValue}
                    placeholder={inputPlaceholder}
                    aria-label={
                      messageTimer
                        ? t('tooltipConversationEphemeralAriaLabel', {time: formatDuration(messageTimer).text})
                        : inputPlaceholder
                    }
                    data-uie-name="input-message"
                    dir="auto"
                  />

                  <div
                    ref={shadowInputRef}
                    className="shadow-input"
                    dangerouslySetInnerHTML={{__html: richTextInput}}
                    data-uie-name="input-message-rich-text"
                    dir="auto"
                  />
                </div>

                <MentionSuggestionList
                  targetInput={textareaRef.current}
                  suggestions={mentionSuggestions}
                  onSelectionValidated={addMention}
                />
                {isScaledDown ? (
                  <>
                    <ul className="controls-right buttons-group" css={{minWidth: '95px'}}>
                      {showGiphyButton && <GiphyButton onGifClick={onGifClick} />}
                      {sendButton}
                    </ul>
                    <ul className="controls-right buttons-group" css={{justifyContent: 'center', width: '100%'}}>
                      <ControlButtons {...controlButtonsProps} isScaledDown={isScaledDown} />
                    </ul>
                  </>
                ) : (
                  <ul className="controls-right buttons-group">
                    <ControlButtons {...controlButtonsProps} showGiphyButton={showGiphyButton} />
                    {sendButton}
                  </ul>
                )}
              </>
            )}
          </>
        )}

        {pastedFile && <PastedFileControls pastedFile={pastedFile} onClear={clearPastedFile} onSend={sendPastedFile} />}
      </div>
    </IgnoreOutsideClickWrapper>
  );
};

export {InputBar};
