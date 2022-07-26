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
  ClipboardEvent,
  FC,
  KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {amplify} from 'amplify';
import cx from 'classnames';
import {container} from 'tsyringe';
import ko from 'knockout';

import ClassifiedBar from 'Components/input/ClassifiedBar';
import Avatar, {AVATAR_SIZE} from 'Components/Avatar';

import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import {loadDraftState, saveDraftState} from 'Util/DraftStateUtil';
import {insertAtCaret, isFunctionKey, KEY} from 'Util/KeyboardUtil';
import {
  createMentionEntity,
  detectMentionEdgeDeletion,
  findMentionAtPosition,
  getMentionCandidate,
  updateMentionRanges,
} from 'Util/MentionUtil';
import {t} from 'Util/LocalizerUtil';
import {afterRender, formatBytes} from 'Util/util';
import {formatLocale, TIME_IN_MILLIS} from 'Util/TimeUtil';
import {allowsAllFiles, getFileExtensionOrName, hasAllowedExtension} from 'Util/FileTypeUtil';

import MentionSuggestionList from '../../page/message-list/MentionSuggestions';
import {TeamState} from '../../team/TeamState';
import {UserState} from '../../user/UserState';
import {SearchRepository} from '../../search/SearchRepository';
import {ContentMessage} from '../../entity/message/ContentMessage';
import InputBarControls from '../../page/message-list/InputBarControls';
import {EmojiInputViewModel} from '../../view_model/content/EmojiInputViewModel';
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
import PastedFileControls from './PastedFileControls';
import ReplyBar from './ReplyBar';
import useScrollSync from '../../hooks/useScrollSync';
import useResizeTarget from '../../hooks/useResizeTarget';
import useTextAreaFocus from '../../hooks/useTextAreaFocus';

const CONFIG = {
  ...Config.getConfig(),
  ASSETS: {
    CONCURRENT_UPLOAD_LIMIT: 10,
  },
  PING_TIMEOUT: TIME_IN_MILLIS.SECOND * 2,
};

interface InputBarProps {
  readonly assetRepository: AssetRepository;
  readonly conversationEntity: Conversation;
  readonly conversationRepository: ConversationRepository;
  readonly emojiInput: EmojiInputViewModel;
  readonly eventRepository: EventRepository;
  readonly messageRepository: MessageRepository;
  readonly searchRepository: SearchRepository;
  readonly storageRepository: StorageRepository;
  readonly teamState: TeamState;
  readonly userState: UserState;
}

const InputBar: FC<InputBarProps> = ({
  assetRepository,
  conversationEntity,
  conversationRepository,
  emojiInput,
  eventRepository,
  messageRepository,
  searchRepository,
  storageRepository,
  userState = container.resolve(UserState),
  teamState = container.resolve(TeamState),
}) => {
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

  const showAvailabilityTooltip = useMemo(() => {
    if (firstUserEntity) {
      const availabilityIsNone = availability === Availability.Type.NONE;

      return inTeam && is1to1 && !availabilityIsNone;
    }

    return false;
  }, [availability, firstUserEntity, inTeam, is1to1]);

  const inputPlaceholder = useMemo(() => {
    if (showAvailabilityTooltip) {
      const availabilityStrings: Record<string, string> = {
        [Availability.Type.AVAILABLE]: t('userAvailabilityAvailable'),
        [Availability.Type.AWAY]: t('userAvailabilityAway'),
        [Availability.Type.BUSY]: t('userAvailabilityBusy'),
      };

      return availabilityStrings[availability];
    }

    return messageTimer ? t('tooltipConversationEphemeral') : t('tooltipConversationInputPlaceholder');
  }, [availability, messageTimer, showAvailabilityTooltip]);

  const shadowInputRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isReplyingToMessagePrevRef = useRef<boolean>(false);

  const [editMessageEntity, setEditMessageEntity] = useState<ContentMessage | null>(null);
  const [replyMessageEntity, setReplyMessageEntity] = useState<ContentMessage | null>(null);

  const [inputValue, setInputValue] = useState<string>('');

  const [selectionStart, setSelectionStart] = useState<number>(0);
  const [selectionEnd, setSelectionEnd] = useState<number>(0);

  const [currentMentions, setCurrentMentions] = useState<MentionEntity[]>([]);
  const [pingDisabled, setIsPingDisabled] = useState<boolean>(false);
  const [conversationHasFocus, setConversationHasFocus] = useState<boolean>(true);

  const [editedMention, setEditedMention] = useState<{startIndex: number; term: string} | undefined>(undefined);

  const [pastedFile, setPastedFile] = useState<File | null>(null);

  const mentionSuggestions = useMemo(() => {
    if (!editedMention) {
      return [];
    }

    const candidates = participatingUserEts.filter(userEntity => !userEntity.isService);

    return searchRepository.searchUserInSet(editedMention.term, candidates);
  }, [editedMention, participatingUserEts]);

  const draftMessage = useMemo(
    () => ({
      mentions: currentMentions,
      reply: replyMessageEntity,
      text: inputValue,
    }),
    [currentMentions, inputValue, replyMessageEntity],
  );

  const isEditing = !!editMessageEntity;
  const isReplying = !!replyMessageEntity;
  const hasFocus = isEditing || conversationHasFocus;
  const isConnectionRequest = isOutgoingRequest || isIncomingRequest;
  const hasLocalEphemeralTimer = isSelfDeletingMessagesEnabled && localMessageTimer && !hasGlobalMessageTimer;

  const focusTextArea = () => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const resetDraftState = () => {
    setCurrentMentions([]);
    setInputValue('');
  };

  const getRichTextInput = () => {
    const mentionAttributes = ' class="input-mention" data-uie-name="item-input-mention"';

    const pieces = currentMentions
      .slice()
      .reverse()
      .reduce(
        (currentPieces, mentionEntity) => {
          const currentPiece = currentPieces.shift();

          if (currentPiece) {
            currentPieces.unshift(currentPiece.slice(mentionEntity.endIndex));
            currentPieces.unshift(
              currentPiece.slice(mentionEntity.startIndex, mentionEntity.startIndex + mentionEntity.length),
            );
            currentPieces.unshift(currentPiece.slice(0, mentionEntity.startIndex));
          }

          return currentPieces;
        },
        [inputValue],
      );

    return pieces
      .map((piece, index) => {
        const textPiece = piece.replace(/[\r\n]/g, '<br>');

        return `<span${index % 2 ? mentionAttributes : ''}>${textPiece}</span>`;
      })
      .join('')
      .replace(/<br><\/span>$/, '<br>&nbsp;</span>');
  };

  const richTextInput = getRichTextInput();

  const clearPastedFile = () => setPastedFile(null);

  const _isHittingUploadLimit = (files: File[]): boolean => {
    const concurrentUploadLimit = CONFIG.ASSETS.CONCURRENT_UPLOAD_LIMIT;
    const concurrentUploads = files.length + assetRepository.getNumberOfOngoingUploads();
    const isHittingUploadLimit = concurrentUploads > concurrentUploadLimit;

    if (isHittingUploadLimit) {
      const modalOptions = {
        text: {
          message: t('modalAssetParallelUploadsMessage', concurrentUploadLimit),
          title: t('modalAssetParallelUploadsHeadline'),
        },
      };

      amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, modalOptions);
    }

    return isHittingUploadLimit;
  };

  const onDropOrPastedFile = (droppedFiles: File[]) => {
    const images: File[] = [];
    const files: File[] = [];

    if (!isFileSharingSendingEnabled) {
      showRestrictedFileSharingModal();

      return;
    }

    const tooManyConcurrentUploads = _isHittingUploadLimit(droppedFiles);

    if (tooManyConcurrentUploads) {
      return;
    }

    Array.from(droppedFiles).forEach((file): void | number => {
      const isSupportedImage = CONFIG.ALLOWED_IMAGE_TYPES.includes(file.type);

      if (isSupportedImage) {
        return images.push(file);
      }

      files.push(file);
    });

    uploadImages(images);
    uploadFiles(files);
  };

  const sendPastedFile = () => {
    if (!pastedFile) {
      return;
    }

    onDropOrPastedFile([pastedFile]);
    clearPastedFile();
  };

  const endMentionFlow = () => {
    setEditedMention(undefined);
    updateSelectionState();
  };

  const addMention = (userEntity: User, inputElement: HTMLInputElement): void => {
    const mentionEntity = createMentionEntity(userEntity, editedMention);

    if (!mentionEntity || !editedMention?.term) {
      return;
    }

    // keep track of what is before and after the mention being edited
    const beforeMentionPartial = inputValue.slice(0, mentionEntity.startIndex);
    const afterMentionPartial = inputValue
      .slice(mentionEntity.startIndex + editedMention.term.length + 1)
      .replace(/^ /, '');

    // insert the mention in between
    setInputValue(`${beforeMentionPartial}@${userEntity.name()} ${afterMentionPartial}`);

    setCurrentMentions(prevState =>
      [...prevState, mentionEntity].sort((mentionA, mentionB) => mentionA.startIndex - mentionB.startIndex),
    );

    const caretPosition = mentionEntity.endIndex + 1;
    inputElement.selectionStart = caretPosition;
    inputElement.selectionEnd = caretPosition;
    endMentionFlow();
  };

  const handleMentionFlow = () => {
    if (textareaRef.current) {
      const {selectionStart, selectionEnd, value} = textareaRef.current;
      const mentionCandidate = getMentionCandidate(currentMentions, selectionStart, selectionEnd, value);

      setEditedMention(mentionCandidate);
      updateSelectionState();
    }
  };

  const updateSelectionState = () => {
    if (!textareaRef.current) {
      return;
    }

    const {selectionStart, selectionEnd} = textareaRef.current;
    const defaultRange = {endIndex: 0, startIndex: Infinity};

    const firstMention = findMentionAtPosition(selectionStart, currentMentions) || defaultRange;
    const lastMention = findMentionAtPosition(selectionEnd, currentMentions) || defaultRange;

    const mentionStart = Math.min(firstMention.startIndex, lastMention.startIndex);
    const mentionEnd = Math.max(firstMention.endIndex, lastMention.endIndex);

    const newStart = Math.min(mentionStart, selectionStart);
    const newEnd = Math.max(mentionEnd, selectionEnd);

    if (newStart !== selectionStart || newEnd !== selectionEnd) {
      textareaRef.current.selectionStart = newStart;
      textareaRef.current.selectionEnd = newEnd;
    }

    setSelectionStart(newStart);
    setSelectionEnd(newEnd);
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

    focusTextArea();
  };

  const moveCursorToEnd = useCallback(() => {
    //todo
    afterRender(() => {
      if (textareaRef.current) {
        focusTextArea();
        const endPosition = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(endPosition, endPosition);
        updateSelectionState();
      }
    });
  }, [updateSelectionState]);

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

      moveCursorToEnd();
    }
  };

  const replyMessage = (messageEntity: ContentMessage): void => {
    if (messageEntity?.isReplyable() && messageEntity !== replyMessageEntity) {
      cancelMessageReply();
      cancelMessageEditing(!!editMessageEntity);
      setReplyMessageEntity(messageEntity);

      focusTextArea();
    }
  };

  const updateMentions = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = event.currentTarget;
    const value = textarea.value;
    const previousValue = inputValue;

    const lengthDifference = value.length - previousValue.length;
    const edgeMention = detectMentionEdgeDeletion(
      textarea,
      currentMentions,
      selectionStart,
      selectionEnd,
      lengthDifference - 1,
    );

    if (edgeMention) {
      textarea.value = inputValue;
      textarea.selectionStart = edgeMention.startIndex;
      textarea.selectionEnd = edgeMention.endIndex;
    }
  };

  const onTextAreaKeyDown = (keyboardEvent: ReactKeyboardEvent<HTMLTextAreaElement>): void | boolean => {
    const inputHandledByEmoji = !editedMention && emojiInput.onInputKeyDown(keyboardEvent);

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
            onSend();
            keyboardEvent.preventDefault();
          }

          if (keyboardEvent.altKey || keyboardEvent.metaKey) {
            if (keyboardEvent.target) {
              insertAtCaret(keyboardEvent.target.toString(), '\n');
              ko.utils.triggerEvent(keyboardEvent.target as Element, 'change');
              keyboardEvent.preventDefault();
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
      emojiInput.onInputKeyUp(keyboardEvent);
    }

    if (keyboardEvent.key !== KEY.ESC) {
      handleMentionFlow();
    }
  };

  const onChange = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();

    setInputValue(e.currentTarget.value);

    const currentValueLength = e.currentTarget.value.length;
    const inputValueLength = inputValue.length;
    const difference = currentValueLength - inputValueLength;

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

  const sendMessage = (messageText: string): void => {
    if (!messageText.length) {
      return;
    }

    const mentionEntities = currentMentions.slice(0);

    generateQuote().then(quoteEntity => {
      messageRepository.sendTextWithLinkPreview(conversationEntity, messageText, mentionEntities, quoteEntity);
      cancelMessageReply();
    });
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
    const messageTrimmedStart = inputValue.trimLeft();
    const afterLength = messageTrimmedStart.length;

    const updatedMentions = updateMentionRanges(currentMentions, 0, 0, afterLength - beforeLength);
    setCurrentMentions(updatedMentions);

    const messageText = messageTrimmedStart.trimRight();

    const isMessageTextTooLong = messageText.length > CONFIG.MAXIMUM_MESSAGE_LENGTH;

    if (isMessageTextTooLong) {
      return amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, {
        text: {
          message: t('modalConversationMessageTooLongMessage', CONFIG.MAXIMUM_MESSAGE_LENGTH),
          title: t('modalConversationMessageTooLongHeadline'),
        },
      });
    }

    if (isEditing) {
      sendMessageEdit(messageText);
    } else {
      sendMessage(messageText);
    }

    resetDraftState();
    focusTextArea();
  };

  const isHittingUploadLimit = (files: File[]) => {
    const concurrentUploadLimit = CONFIG.ASSETS.CONCURRENT_UPLOAD_LIMIT;
    const concurrentUploads = files.length + assetRepository.getNumberOfOngoingUploads();
    const isHittingUploadLimit = concurrentUploads > CONFIG.ASSETS.CONCURRENT_UPLOAD_LIMIT;

    if (isHittingUploadLimit) {
      const modalOptions = {
        text: {
          message: t('modalAssetParallelUploadsMessage', concurrentUploadLimit),
          title: t('modalAssetParallelUploadsHeadline'),
        },
      };

      amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, modalOptions);
    }

    return isHittingUploadLimit;
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

          return false;
        }
      }
    }

    const uploadLimit = inTeam ? CONFIG.MAXIMUM_ASSET_FILE_SIZE_TEAM : CONFIG.MAXIMUM_ASSET_FILE_SIZE_PERSONAL;

    if (!isHittingUploadLimit(files)) {
      for (const file of fileArray) {
        const isFileTooLarge = file.size > uploadLimit;

        if (isFileTooLarge) {
          const fileSize = formatBytes(uploadLimit);
          const options = {
            text: {
              message: t('modalAssetTooLargeMessage', fileSize),
              title: t('modalAssetTooLargeHeadline'),
            },
          };

          return amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, options);
        }
      }

      messageRepository.uploadFiles(conversationEntity, files);
    }

    return false;
  };

  const uploadImages = (images: File[]) => {
    if (!isHittingUploadLimit(images)) {
      for (const image of Array.from(images)) {
        const isImageTooLarge = image.size > CONFIG.MAXIMUM_IMAGE_FILE_SIZE;

        if (isImageTooLarge) {
          const isGif = image.type === 'image/gif';
          const maxSize = CONFIG.MAXIMUM_IMAGE_FILE_SIZE / 1024 / 1024;

          const modalOptions = {
            text: {
              message: t(isGif ? 'modalGifTooLargeMessage' : 'modalPictureTooLargeMessage', maxSize),
              title: t(isGif ? 'modalGifTooLargeHeadline' : 'modalPictureTooLargeHeadline'),
            },
          };

          amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, modalOptions);

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

  const showRestrictedFileSharingModal = (): void => {
    amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, {
      text: {
        message: t('conversationModalRestrictedFileSharingDescription'),
        title: t('conversationModalRestrictedFileSharingHeadline'),
      },
    });
  };

  const onPasteFiles = (event: ClipboardEvent): void => {
    if (event.clipboardData.types.includes('text/plain')) {
      return;
    }

    const pastedFiles = event.clipboardData.files;

    if (!isFileSharingSendingEnabled) {
      showRestrictedFileSharingModal();

      return;
    }

    const [pastedFile] = pastedFiles;
    const {lastModified} = pastedFile;

    const date = formatLocale(lastModified || new Date(), 'PP, pp');
    const fileName = t('conversationSendPastedFile', date);

    const newFile = new File([pastedFile], fileName, {
      type: pastedFile.type,
    });

    setPastedFile(newFile);
  };

  const loadInitialStateForConversation = async (): Promise<void> => {
    setConversationHasFocus(true);
    setPastedFile(null);
    cancelMessageEditing();
    cancelMessageReply();
    endMentionFlow();

    if (conversationEntity) {
      const previousSessionData = await loadDraftState(conversationEntity, storageRepository, messageRepository);

      if (previousSessionData?.text) {
        setInputValue(previousSessionData.text);
      }

      if (previousSessionData?.mentions.length > 0) {
        setCurrentMentions(previousSessionData.mentions);
      }

      updateSelectionState();

      if (previousSessionData.replyEntityPromise) {
        previousSessionData.replyEntityPromise.then(replyEntity => {
          if (replyEntity?.isReplyable()) {
            setReplyMessageEntity(replyEntity);
          }
        });
      }
    }
  };

  const sendGiphy = (gifUrl: string, tag: string): void => {
    generateQuote().then(quoteEntity => {
      if (!quoteEntity) {
        return;
      }

      messageRepository.sendGif(conversationEntity, gifUrl, tag, quoteEntity);
      cancelMessageEditing(true);
    });
  };

  const onWindowClick = (event: Event): void => {
    const ignoredParent = (event.target as HTMLElement).closest(
      '.conversation-input-bar, .conversation-input-bar-mention-suggestion, .ctx-menu',
    );

    if (ignoredParent) {
      return;
    }

    cancelMessageEditing();
    cancelMessageReply();
  };

  useEffect(() => {
    amplify.subscribe(WebAppEvents.CONVERSATION.IMAGE.SEND, uploadImages);
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.EDIT, editMessage);
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.REPLY, replyMessage);
    amplify.subscribe(WebAppEvents.EXTENSIONS.GIPHY.SEND, sendGiphy);
    amplify.subscribe(WebAppEvents.SEARCH.SHOW, () => setConversationHasFocus(false));
    amplify.subscribe(WebAppEvents.SEARCH.HIDE, () => {
      window.requestAnimationFrame(() => setConversationHasFocus(true));
    });
    amplify.subscribe(WebAppEvents.SHORTCUT.PING, onPingClick);

    return () => {
      amplify.unsubscribeAll(WebAppEvents.SHORTCUT.PING);
    };
  }, []);

  useEffect(() => {
    loadInitialStateForConversation();
  }, []);

  useEffect(() => {
    if (!isEditing) {
      saveDraftState(storageRepository, conversationEntity, draftMessage);
    }
  }, [isEditing, draftMessage]);

  useTextAreaFocus(focusTextArea);

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
    const isReplyingToMessage = !!replyMessageEntity;
    const wasReplyingToMessage = isReplyingToMessagePrevRef.current;

    if (isReplyingToMessage !== wasReplyingToMessage) {
      if (isReplyingToMessage) {
        amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, handleRepliedMessageDeleted);
        amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.UPDATED, handleRepliedMessageUpdated);
      } else {
        amplify.unsubscribe(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, handleRepliedMessageDeleted);
        amplify.unsubscribe(WebAppEvents.CONVERSATION.MESSAGE.UPDATED, handleRepliedMessageUpdated);
      }
    }

    isReplyingToMessagePrevRef.current = isReplyingToMessage;
  }, [replyMessageEntity, isReplyingToMessagePrevRef.current]);

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
  useEffect(() => {
    const getConversationContainer = document.querySelector('#conversation');

    const onDragOver = (event: Event) => event.preventDefault();

    const onDropFiles = (event: Event) => {
      event.preventDefault();

      const {dataTransfer} = event as DragEvent;
      const eventDataTransfer = dataTransfer || {};
      const files = (eventDataTransfer as DataTransfer).files || new FileList();

      if (files.length > 0) {
        onDropOrPastedFile([files[0]]);
      }
    };

    if (getConversationContainer) {
      getConversationContainer.addEventListener('drop', onDropFiles);
      getConversationContainer.addEventListener('dragover', onDragOver);

      return () => {
        getConversationContainer.removeEventListener('drop', onDropFiles);
        getConversationContainer.removeEventListener('dragover', onDragOver);
      };
    }

    return () => undefined;
  }, []);

  // console.log('przemvs isReplying', isReplying);
  // console.log('przemvs isEditing', isEditing);

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

            {!removedFromConversation && (
              <>
                <div className="controls-center">
                  <textarea
                    /* eslint-disable-next-line jsx-a11y/no-autofocus */
                    autoFocus={hasFocus}
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
                  suggestions={mentionSuggestions}
                  targetInputSelector="#conversation-input-bar-text"
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
