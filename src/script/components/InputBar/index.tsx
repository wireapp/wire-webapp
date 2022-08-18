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

import {Availability} from '@wireapp/protocol-messaging';
import {WebAppEvents} from '@wireapp/webapp-events';
import {
  ClipboardEvent as ReactClipboardEvent,
  KeyboardEvent as ReactKeyboardEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {amplify} from 'amplify';
import cx from 'classnames';
import {container} from 'tsyringe';

import ClassifiedBar from 'Components/input/ClassifiedBar';
import Avatar, {AVATAR_SIZE} from 'Components/Avatar';
import useEmoji from 'Components/Emoji/useEmoji';

import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import {loadDraftState, saveDraftState} from 'Util/DraftStateUtil';
import isHittingUploadLimit from 'Util/isHittingUploadLimit';
import {insertAtCaret, isFunctionKey, KEY} from 'Util/KeyboardUtil';
import {
  createMentionEntity,
  detectMentionEdgeDeletion,
  getMentionCandidate,
  updateMentionRanges,
} from 'Util/MentionUtil';
import {t} from 'Util/LocalizerUtil';
import {formatBytes, getSelectionPosition} from 'Util/util';
import {formatLocale, TIME_IN_MILLIS} from 'Util/TimeUtil';
import {allowsAllFiles, getFileExtensionOrName, hasAllowedExtension} from 'Util/FileTypeUtil';

import getRichTextInput from './getRichTextInput';
import MentionSuggestionList from '../../page/message-list/MentionSuggestions';
import {TeamState} from '../../team/TeamState';
import {UserState} from '../../user/UserState';
import {SearchRepository} from '../../search/SearchRepository';
import {ContentMessage} from '../../entity/message/ContentMessage';
import InputBarControls from '../../page/message-list/InputBarControls';
import {Conversation} from '../../entity/Conversation';
import {AssetRepository} from '../../assets/AssetRepository';
import {ConversationRepository} from '../../conversation/ConversationRepository';
import {EventRepository} from '../../event/EventRepository';
import {MessageRepository, OutgoingQuote} from '../../conversation/MessageRepository';
import {StorageRepository} from '../../storage';
import {MentionEntity} from '../../message/MentionEntity';
import {Config} from '../../Config';
import {ModalsViewModel} from '../../view_model/ModalsViewModel';
import {ConversationError} from '../../error/ConversationError';
import {MessageHasher} from '../../message/MessageHasher';
import {QuoteEntity} from '../../message/QuoteEntity';
import {Text as TextAsset} from '../../entity/message/Text';
import {User} from '../../entity/User';
import {PropertiesRepository} from '../../properties/PropertiesRepository';

import PastedFileControls from './PastedFileControls';
import ReplyBar from './ReplyBar';

import useScrollSync from '../../hooks/useScrollSync';
import useResizeTarget from '../../hooks/useResizeTarget';
import useDropFiles from '../../hooks/useDropFiles';
import useTextAreaFocus from '../../hooks/useTextAreaFocus';

const CONFIG = {
  ...Config.getConfig(),
  PING_TIMEOUT: TIME_IN_MILLIS.SECOND * 2,
};

const showWarningModal = (title: string, message: string): void => {
  // Timeout needed for display warning modal - we need to update modal
  setTimeout(() => {
    amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, {
      text: {message, title},
    });
  }, 0);
};

interface InputBarProps {
  readonly assetRepository: AssetRepository;
  readonly conversationEntity: Conversation;
  readonly conversationRepository: ConversationRepository;
  readonly eventRepository: EventRepository;
  readonly messageRepository: MessageRepository;
  readonly propertiesRepository: PropertiesRepository;
  readonly searchRepository: SearchRepository;
  readonly storageRepository: StorageRepository;
  readonly teamState: TeamState;
  readonly userState: UserState;
}

const InputBar = ({
  assetRepository,
  conversationEntity,
  conversationRepository,
  eventRepository,
  messageRepository,
  propertiesRepository,
  searchRepository,
  storageRepository,
  userState = container.resolve(UserState),
  teamState = container.resolve(TeamState),
}: InputBarProps) => {
  const {classifiedDomains, isSelfDeletingMessagesEnabled, isFileSharingSendingEnabled} = useKoSubscribableChildren(
    teamState,
    ['classifiedDomains', 'isSelfDeletingMessagesEnabled', 'isFileSharingSendingEnabled'],
  );
  const {self: selfUser} = useKoSubscribableChildren(userState, ['self']);
  const {inTeam} = useKoSubscribableChildren(selfUser, ['inTeam']);
  const {
    connection,
    firstUserEntity,
    participating_user_ets: participatingUserEts,
    localMessageTimer,
    messageTimer,
    hasGlobalMessageTimer,
    removed_from_conversation: removedFromConversation,
    is1to1,
  } = useKoSubscribableChildren(conversationEntity, [
    'connection',
    'firstUserEntity',
    'participating_user_ets',
    'localMessageTimer',
    'messageTimer',
    'hasGlobalMessageTimer',
    'removed_from_conversation',
    'is1to1',
  ]);
  const {availability} = useKoSubscribableChildren(firstUserEntity, ['availability']);
  const {isOutgoingRequest, isIncomingRequest} = useKoSubscribableChildren(connection, [
    'isOutgoingRequest',
    'isIncomingRequest',
  ]);

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
  const [editedMention, setEditedMention] = useState<{startIndex: number; term: string} | undefined>(undefined);

  const {
    onInputKeyDown: emojiKeyDown,
    onInputKeyUp: emojiKeyUp,
    renderEmojiComponent,
  } = useEmoji(propertiesRepository, setInputValue, textareaRef.current);

  const availabilityIsNone = availability === Availability.Type.NONE;
  const showAvailabilityTooltip = firstUserEntity && inTeam && is1to1 && !availabilityIsNone;
  const availabilityStrings: Record<string, string> = {
    [Availability.Type.AVAILABLE]: t('userAvailabilityAvailable'),
    [Availability.Type.AWAY]: t('userAvailabilityAway'),
    [Availability.Type.BUSY]: t('userAvailabilityBusy'),
  };

  const inputPlaceholder = useMemo(() => {
    if (showAvailabilityTooltip) {
      return availabilityStrings[availability];
    }

    return messageTimer ? t('tooltipConversationEphemeral') : t('tooltipConversationInputPlaceholder');
  }, [availability, messageTimer, showAvailabilityTooltip]);

  const candidates = participatingUserEts.filter(userEntity => !userEntity.isService);
  const mentionSuggestions = editedMention ? searchRepository.searchUserInSet(editedMention.term, candidates) : [];

  const isEditing = !!editMessageEntity;
  const isReplying = !!replyMessageEntity;
  const isConnectionRequest = isOutgoingRequest || isIncomingRequest;
  const hasLocalEphemeralTimer = isSelfDeletingMessagesEnabled && localMessageTimer && !hasGlobalMessageTimer;

  const richTextInput = getRichTextInput(currentMentions, inputValue);

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

  const resetDraftState = () => {
    setCurrentMentions([]);
    setInputValue('');
  };

  const clearPastedFile = () => setPastedFile(null);

  const onDropOrPastedFile = (droppedFiles: File[]) => {
    const images: File[] = [];
    const files: File[] = [];

    if (!isFileSharingSendingEnabled) {
      showWarningModal(
        t('conversationModalRestrictedFileSharingHeadline'),
        t('conversationModalRestrictedFileSharingDescription'),
      );

      return;
    }

    if (!isHittingUploadLimit(droppedFiles, assetRepository)) {
      Array.from(droppedFiles).forEach((file): void | number => {
        const isSupportedImage = CONFIG.ALLOWED_IMAGE_TYPES.includes(file.type);

        if (isSupportedImage) {
          return images.push(file);
        }

        files.push(file);
      });

      uploadImages(images);
      uploadFiles(files);
    }
  };

  const sendPastedFile = () => {
    if (pastedFile) {
      onDropOrPastedFile([pastedFile]);
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
      setCurrentMentions(newMentions.sort((mentionA, mentionB) => mentionA.startIndex - mentionB.startIndex));

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

  const cancelMessageEditing = (resetDraft = true) => {
    setEditMessageEntity(null);
    setReplyMessageEntity(null);

    if (resetDraft) {
      resetDraftState();
    }
  };

  const handleCancelReply = () => {
    if (!mentionSuggestions.length) {
      cancelMessageReply();
    }

    textareaRef.current?.focus();
  };

  const editMessage = (messageEntity: ContentMessage) => {
    if (messageEntity?.isEditable() && messageEntity !== editMessageEntity) {
      const firstAsset = messageEntity.getFirstAsset() as TextAsset;
      const newMentions = firstAsset.mentions().slice();

      cancelMessageReply();
      cancelMessageEditing();
      setEditMessageEntity(messageEntity);
      setInputValue(firstAsset.text);
      setCurrentMentions(newMentions);

      if (messageEntity.quote() && conversationEntity) {
        messageRepository
          .getMessageInConversationById(conversationEntity, messageEntity.quote().messageId)
          .then(quotedMessage => setReplyMessageEntity(quotedMessage));
      }

      moveCursorToEnd(firstAsset.text.length);
    }
  };

  const replyMessage = (messageEntity: ContentMessage): void => {
    if (messageEntity?.isReplyable() && messageEntity !== replyMessageEntity) {
      cancelMessageReply();
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
            cancelMessageEditing();
          } else if (isReplying) {
            cancelMessageReply(false);
          }
          break;
        }
        case KEY.ENTER: {
          if (!keyboardEvent.shiftKey && !keyboardEvent.altKey && !keyboardEvent.metaKey) {
            keyboardEvent.preventDefault();
            onSend();
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
      // emojiInput.onInputKeyUp(keyboardEvent);
    }

    if (keyboardEvent.key !== KEY.ESC) {
      handleMentionFlow(keyboardEvent);
    }
  };

  const onChange = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    event.preventDefault();

    const {value: currentValue} = event.currentTarget;
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

  const sendMessage = (messageText: string) => {
    if (messageText.length) {
      const mentionEntities = currentMentions.slice(0);

      generateQuote().then(quoteEntity => {
        messageRepository.sendTextWithLinkPreview(conversationEntity, messageText, mentionEntities, quoteEntity);
        cancelMessageReply();
      });
    }
  };

  const sendMessageEdit = (messageText: string): void | Promise<any> => {
    const mentionEntities = currentMentions.slice(0);
    cancelMessageEditing();

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

  const onSend = (): void | boolean => {
    if (pastedFile) {
      return sendPastedFile();
    }

    const beforeLength = inputValue.length;
    const messageText = inputValue.trim();
    const afterLength = messageText.length;
    const isMessageTextTooLong = afterLength > CONFIG.MAXIMUM_MESSAGE_LENGTH;

    if (isMessageTextTooLong) {
      showWarningModal(
        t('modalConversationMessageTooLongHeadline'),
        t('modalConversationMessageTooLongMessage', CONFIG.MAXIMUM_MESSAGE_LENGTH),
      );

      return;
    }

    const updatedMentions = updateMentionRanges(currentMentions, 0, 0, afterLength - beforeLength);
    setCurrentMentions(updatedMentions);

    if (isEditing) {
      sendMessageEdit(messageText);
    } else {
      sendMessage(messageText);
    }

    resetDraftState();
    textareaRef.current?.focus();
  };

  const uploadFiles = (files: File[]) => {
    const fileArray = Array.from(files);

    if (!allowsAllFiles()) {
      for (const file of fileArray) {
        if (!hasAllowedExtension(file.name)) {
          conversationRepository.injectFileTypeRestrictedMessage(
            conversationEntity,
            selfUser,
            false,
            getFileExtensionOrName(file.name),
          );

          return;
        }
      }
    }

    const uploadLimit = inTeam ? CONFIG.MAXIMUM_ASSET_FILE_SIZE_TEAM : CONFIG.MAXIMUM_ASSET_FILE_SIZE_PERSONAL;

    if (!isHittingUploadLimit(files, assetRepository)) {
      for (const file of fileArray) {
        const isFileTooLarge = file.size > uploadLimit;

        if (isFileTooLarge) {
          const fileSize = formatBytes(uploadLimit);
          showWarningModal(t('modalAssetTooLargeHeadline'), t('modalAssetTooLargeMessage', fileSize));

          return;
        }
      }

      messageRepository.uploadFiles(conversationEntity, files);
    }
  };

  const uploadImages = (images: File[]) => {
    if (!isHittingUploadLimit(images, assetRepository)) {
      for (const image of Array.from(images)) {
        const isImageTooLarge = image.size > CONFIG.MAXIMUM_IMAGE_FILE_SIZE;

        if (isImageTooLarge) {
          const isGif = image.type === 'image/gif';
          const maxSize = CONFIG.MAXIMUM_IMAGE_FILE_SIZE / 1024 / 1024;

          showWarningModal(
            t(isGif ? 'modalGifTooLargeHeadline' : 'modalPictureTooLargeHeadline'),
            t(isGif ? 'modalGifTooLargeMessage' : 'modalPictureTooLargeMessage', maxSize),
          );

          return;
        }
      }

      messageRepository.uploadImages(conversationEntity, images);
    }
  };

  const onGifClick = () => amplify.publish(WebAppEvents.EXTENSIONS.GIPHY.SHOW, inputValue);

  const onPingClick = () => {
    if (conversationEntity && !pingDisabled) {
      setIsPingDisabled(true);

      messageRepository.sendPing(conversationEntity).then(() => {
        window.setTimeout(() => setIsPingDisabled(false), CONFIG.PING_TIMEOUT);
      });
    }
  };

  const onPasteFiles = (event: ClipboardEvent | ReactClipboardEvent): void => {
    if (event?.clipboardData?.types.includes('text/plain')) {
      return;
    }

    if (!isFileSharingSendingEnabled) {
      showWarningModal(
        t('conversationModalRestrictedFileSharingHeadline'),
        t('conversationModalRestrictedFileSharingDescription'),
      );

      return;
    }

    const pastedFiles = event?.clipboardData?.files;
    if (pastedFiles) {
      const [pastedFile] = pastedFiles;
      const {lastModified} = pastedFile;

      const date = formatLocale(lastModified || new Date(), 'PP, pp');
      const fileName = t('conversationSendPastedFile', date);

      const newFile = new File([pastedFile], fileName, {
        type: pastedFile.type,
      });

      setPastedFile(newFile);
    }
  };

  const loadInitialStateForConversation = async (): Promise<void> => {
    setPastedFile(null);
    cancelMessageEditing();
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
      if (quoteEntity) {
        messageRepository.sendGif(conversationEntity, gifUrl, tag, quoteEntity);
        cancelMessageEditing(true);
      }
    });
  };

  const onWindowClick = (event: Event): void => {
    const ignoredParent = (event.target as HTMLElement).closest(
      '.conversation-input-bar, .conversation-input-bar-mention-suggestion, .ctx-menu',
    );

    if (!ignoredParent) {
      cancelMessageEditing();
      cancelMessageReply();
    }
  };

  useEffect(() => {
    loadInitialStateForConversation();

    amplify.subscribe(WebAppEvents.CONVERSATION.IMAGE.SEND, uploadImages);
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.EDIT, editMessage);
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.REPLY, replyMessage);
    amplify.subscribe(WebAppEvents.EXTENSIONS.GIPHY.SEND, sendGiphy);
    amplify.subscribe(WebAppEvents.SEARCH.HIDE, () => window.requestAnimationFrame(() => textareaRef.current?.focus()));
    amplify.subscribe(WebAppEvents.SHORTCUT.PING, onPingClick);

    return () => {
      amplify.unsubscribeAll(WebAppEvents.SHORTCUT.PING);
    };
  }, []);

  useEffect(() => {
    if (!isEditing) {
      saveDraftState(storageRepository, conversationEntity, {
        mentions: currentMentions,
        text: inputValue,
        ...(replyMessageEntity && {reply: replyMessageEntity}),
      });
    }
  }, [isEditing, currentMentions, replyMessageEntity, inputValue]);

  useTextAreaFocus(() => {
    textareaRef.current?.focus();
  });

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

  // Temporarily functionality for dropping files on conversation container, should be moved to Conversation Component
  useDropFiles('#conversation', onDropOrPastedFile);

  useEffect(() => {
    document.addEventListener('paste', onPasteFiles);
    return () => document.removeEventListener('paste', onPasteFiles);
  }, []);

  return (
    <div id="conversation-input-bar" className="conversation-input-bar">
      {classifiedDomains && !isConnectionRequest && (
        <ClassifiedBar users={participatingUserEts} classifiedDomains={classifiedDomains} />
      )}

      {isReplying && !isEditing && <ReplyBar replyMessageEntity={replyMessageEntity} onCancel={handleCancelReply} />}

      <div className={cx('conversation-input-bar__input', {'conversation-input-bar__input--editing': isEditing})}>
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
                    id="conversation-input-bar-text"
                    className={cx('conversation-input-bar-text', {
                      'conversation-input-bar-text--accent': hasLocalEphemeralTimer,
                    })}
                    onKeyDown={onTextAreaKeyDown}
                    onKeyUp={onTextareaKeyUp}
                    onClick={handleMentionFlow}
                    onInput={updateMentions}
                    onChange={onChange}
                    onPaste={onPasteFiles}
                    value={inputValue}
                    placeholder={inputPlaceholder}
                    aria-label={inputPlaceholder}
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

                <InputBarControls
                  conversation={conversationEntity}
                  input={inputValue}
                  isEditing={isEditing}
                  disablePing={pingDisabled}
                  disableFilesharing={!isFileSharingSendingEnabled}
                  onSend={onSend}
                  onSelectFiles={uploadFiles}
                  onSelectImages={uploadImages}
                  onCancelEditing={cancelMessageEditing}
                  onClickGif={onGifClick}
                  onClickPing={onPingClick}
                />
              </>
            )}
          </>
        )}

        {pastedFile && <PastedFileControls pastedFile={pastedFile} onClear={clearPastedFile} onSend={sendPastedFile} />}
      </div>
    </div>
  );
};

export default InputBar;

registerReactComponent('input-bar', InputBar);
