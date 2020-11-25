/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {escape} from 'underscore';
import {Availability} from '@wireapp/protocol-messaging';
import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';
import ko from 'knockout';

import {t} from 'Util/LocalizerUtil';
import {TIME_IN_MILLIS, formatLocale} from 'Util/TimeUtil';
import {afterRender, formatBytes} from 'Util/util';
import {allowsAllFiles, hasAllowedExtension, getFileExtensionOrName} from 'Util/FileTypeUtil';
import {renderMessage} from 'Util/messageRenderer';
import {KEY, isFunctionKey, insertAtCaret} from 'Util/KeyboardUtil';
import {AVATAR_SIZE} from 'Components/ParticipantAvatar';

import {ModalsViewModel} from '../ModalsViewModel';

import {StorageKey} from '../../storage/StorageKey';

import {QuoteEntity} from '../../message/QuoteEntity';
import {MessageHasher} from '../../message/MessageHasher';
import {MentionEntity} from '../../message/MentionEntity';

import {Shortcut} from '../../ui/Shortcut';
import {ShortcutType} from '../../ui/ShortcutType';
import {Config} from '../../Config';
import {ConversationError} from '../../error/ConversationError';
import {AssetRepository} from 'src/script/assets/AssetRepository';
import {EventRepository} from 'src/script/event/EventRepository';
import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {SearchRepository} from 'src/script/search/SearchRepository';
import {StorageRepository} from 'src/script/storage';
import {EmojiInputViewModel} from './EmojiInputViewModel';
import {User} from 'src/script/entity/User';
import {Conversation} from 'src/script/entity/Conversation';
import {Text} from 'src/script/entity/message/Text';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {Asset} from 'src/script/entity/message/Asset';
import {FileAsset} from 'src/script/entity/message/FileAsset';
import {MediumImage} from 'src/script/entity/message/MediumImage';
import {MessageRepository} from 'src/script/conversation/MessageRepository';
import {container} from 'tsyringe';
import {UserState} from '../../user/UserState';
import {ConversationState} from '../../conversation/ConversationState';

type DraftMessage = {
  mentions: MentionEntity[];
  reply: ContentMessage;
  replyEntityPromise?: Promise<ContentMessage>;
  text: string;
};

interface Draft {
  mentions: MentionEntity[];
  reply: {messageId?: string};
  text: string;
}

export class InputBarViewModel {
  private shadowInput: HTMLDivElement;
  private textarea: HTMLTextAreaElement;
  private readonly selectionStart: ko.Observable<number>;
  private readonly selectionEnd: ko.Observable<number>;
  readonly participantAvatarSize = AVATAR_SIZE.X_SMALL;
  readonly conversationEntity: ko.Observable<Conversation>;
  readonly selfUser: ko.Observable<User>;
  private readonly conversationHasFocus: ko.Observable<boolean>;
  private readonly editMessageEntity: ko.Observable<ContentMessage>;
  readonly replyMessageEntity: ko.Observable<ContentMessage>;
  readonly replyAsset: ko.PureComputed<Asset | FileAsset | Text | MediumImage>;
  readonly isEditing: ko.PureComputed<boolean>;
  readonly isReplying: ko.PureComputed<boolean>;
  readonly replyMessageId: ko.PureComputed<string>;
  readonly pastedFile: ko.Observable<File>;
  readonly pastedFilePreviewUrl: ko.Observable<string>;
  readonly pastedFileName: ko.Observable<string>;
  readonly pingDisabled: ko.Observable<boolean>;
  private readonly editedMention: ko.Observable<{startIndex: number; term: string}>;
  private readonly currentMentions: ko.ObservableArray<MentionEntity>;
  readonly hasFocus: ko.PureComputed<boolean>;
  private readonly hasTextInput: ko.PureComputed<boolean>;
  private readonly draftMessage: ko.PureComputed<DraftMessage>;
  readonly mentionSuggestions: ko.PureComputed<User[]>;
  readonly richTextInput: ko.PureComputed<string>;
  readonly inputPlaceholder: ko.PureComputed<string>;
  readonly showGiphyButton: ko.PureComputed<boolean>;
  readonly pingTooltip: string;
  readonly hasLocalEphemeralTimer: ko.PureComputed<boolean>;
  readonly renderMessage: typeof renderMessage;
  readonly input: ko.Observable<string>;
  private readonly showAvailabilityTooltip: ko.PureComputed<boolean>;
  readonly allowedImageTypes: string;
  readonly allowedFileTypes: string;

  static get CONFIG() {
    return {
      ASSETS: {
        CONCURRENT_UPLOAD_LIMIT: 10,
      },
      GIPHY_TEXT_LENGTH: 256,
      PING_TIMEOUT: TIME_IN_MILLIS.SECOND * 2,
    };
  }

  constructor(
    private readonly emojiInput: EmojiInputViewModel,
    private readonly assetRepository: AssetRepository,
    private readonly eventRepository: EventRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly searchRepository: SearchRepository,
    private readonly storageRepository: StorageRepository,
    private readonly messageRepository: MessageRepository,
    private readonly userState = container.resolve(UserState),
    private readonly conversationState = container.resolve(ConversationState),
  ) {
    this.shadowInput = null;
    this.textarea = null;
    this.allowedImageTypes = Config.getConfig().ALLOWED_IMAGE_TYPES.join(',');
    this.allowedFileTypes = Config.getConfig().FEATURE.ALLOWED_FILE_UPLOAD_EXTENSIONS.join(',');

    this.selectionStart = ko.observable(0);
    this.selectionEnd = ko.observable(0);

    this.conversationEntity = this.conversationState.activeConversation;
    this.selfUser = this.userState.self;

    this.conversationHasFocus = ko.observable(true).extend({notify: 'always'});

    this.editMessageEntity = ko.observable();
    this.replyMessageEntity = ko.observable();

    const handleRepliedMessageDeleted = (messageId: string) => {
      if (this.replyMessageEntity()?.id === messageId) {
        this.replyMessageEntity(undefined);
      }
    };

    const handleRepliedMessageUpdated = (originalMessageId: string, messageEntity: ContentMessage) => {
      if (this.replyMessageEntity()?.id === originalMessageId) {
        this.replyMessageEntity(messageEntity);
      }
    };

    const computedReplyMessageEntity: any = ko
      .pureComputed(() => !!this.replyMessageEntity())
      .extend({notify: 'always', rateLimit: 100});

    computedReplyMessageEntity.subscribeChanged((isReplyingToMessage: boolean, wasReplyingToMessage: boolean) => {
      if (isReplyingToMessage !== wasReplyingToMessage) {
        this.triggerInputChangeEvent();
        if (isReplyingToMessage) {
          amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, handleRepliedMessageDeleted);
          amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.UPDATED, handleRepliedMessageUpdated);
        } else {
          amplify.unsubscribe(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, handleRepliedMessageDeleted);
          amplify.unsubscribe(WebAppEvents.CONVERSATION.MESSAGE.UPDATED, handleRepliedMessageUpdated);
        }
      }
    });

    this.replyAsset = ko.pureComputed(() => {
      return this.replyMessageEntity()?.assets()?.[0];
    });

    this.isEditing = ko.pureComputed(() => !!this.editMessageEntity());
    this.isReplying = ko.pureComputed(() => !!this.replyMessageEntity());
    this.replyMessageId = ko.pureComputed(() => this.replyMessageEntity()?.id);

    this.pastedFile = ko.observable();
    this.pastedFilePreviewUrl = ko.observable();
    this.pastedFileName = ko.observable();

    this.pingDisabled = ko.observable(false);

    this.editedMention = ko.observable(undefined);
    this.currentMentions = ko.observableArray();

    this.hasFocus = ko.pureComputed(() => this.isEditing() || this.conversationHasFocus()).extend({notify: 'always'});
    this.hasTextInput = ko.pureComputed(() => !!this.input().length);

    this.input = ko.observable('');

    (this.input as any).subscribeChanged((newValue: string, oldValue: string) => {
      const difference = newValue.length - oldValue.length;
      const updatedMentions = this.updateMentionRanges(
        this.currentMentions(),
        this.selectionStart(),
        this.selectionEnd(),
        difference,
      );
      this.currentMentions(updatedMentions);
      this.updateSelectionState();
    });

    this.draftMessage = ko
      .pureComputed(() => {
        const text = this.input();
        const mentions = this.currentMentions();
        const reply = this.replyMessageEntity();
        return {mentions, reply, text};
      })
      .extend({rateLimit: {method: 'notifyWhenChangesStop', timeout: 1}});

    this.mentionSuggestions = ko.pureComputed(() => {
      if (!this.editedMention() || !this.conversationEntity()) {
        return [];
      }

      const candidates = this.conversationEntity()
        .participating_user_ets()
        .filter(userEntity => !userEntity.isService);
      return this.searchRepository.searchUserInSet(this.editedMention().term, candidates);
    });

    this.richTextInput = ko.pureComputed(() => {
      const mentionAttributes = ' class="input-mention" data-uie-name="item-input-mention"';
      const pieces = this.currentMentions()
        .slice()
        .reverse()
        .reduce(
          (currentPieces, mentionEntity) => {
            const currentPiece = currentPieces.shift();
            currentPieces.unshift(currentPiece.substr(mentionEntity.endIndex));
            currentPieces.unshift(currentPiece.substr(mentionEntity.startIndex, mentionEntity.length));
            currentPieces.unshift(currentPiece.substr(0, mentionEntity.startIndex));
            return currentPieces;
          },
          [this.input()],
        );

      return pieces
        .map((piece, index) => {
          const textPiece = escape(piece).replace(/[\r\n]/g, '<br>');
          return `<span${index % 2 ? mentionAttributes : ''}>${textPiece}</span>`;
        })
        .join('')
        .replace(/<br><\/span>$/, '<br>&nbsp;</span>');
    });

    this.richTextInput.subscribe(() => {
      if (this.textarea && this.shadowInput) {
        afterRender(() => {
          if (this.shadowInput.scrollTop !== this.textarea.scrollTop) {
            this.shadowInput.scrollTop = this.textarea.scrollTop;
          }
        });
      }
    });

    this.inputPlaceholder = ko.pureComputed(() => {
      if (this.showAvailabilityTooltip()) {
        const userEntity = this.conversationEntity().firstUserEntity();
        const availabilityStrings: Record<string, string> = {
          [Availability.Type.AVAILABLE]: t('userAvailabilityAvailable'),
          [Availability.Type.AWAY]: t('userAvailabilityAway'),
          [Availability.Type.BUSY]: t('userAvailabilityBusy'),
        };

        return availabilityStrings[userEntity.availability()];
      }

      const string = this.conversationEntity().messageTimer()
        ? t('tooltipConversationEphemeral')
        : t('tooltipConversationInputPlaceholder');

      return string;
    });

    this.showAvailabilityTooltip = ko.pureComputed(() => {
      if (this.conversationEntity()?.firstUserEntity()) {
        const isOne2OneConversation = this.conversationEntity().is1to1();
        const firstUserEntity = this.conversationEntity().firstUserEntity();
        const availabilityIsNone = firstUserEntity.availability() === Availability.Type.NONE;
        return this.selfUser().inTeam() && isOne2OneConversation && !availabilityIsNone;
      }

      return false;
    });

    this.showGiphyButton = ko.pureComputed(() => {
      return this.hasTextInput() && this.input().length <= InputBarViewModel.CONFIG.GIPHY_TEXT_LENGTH;
    });

    const pingShortcut = Shortcut.getShortcutTooltip(ShortcutType.PING);
    this.pingTooltip = t('tooltipConversationPing', pingShortcut);

    this.isEditing.subscribe(isEditing => {
      if (isEditing) {
        return window.addEventListener('click', this.onWindowClick);
      }

      window.removeEventListener('click', this.onWindowClick);
    });

    this.pastedFile.subscribe(blob => {
      if (blob) {
        const isSupportedFileType = Config.getConfig().ALLOWED_IMAGE_TYPES.includes(blob.type);
        if (isSupportedFileType) {
          this.pastedFilePreviewUrl(URL.createObjectURL(blob));
        }

        const date = formatLocale(blob.lastModified || new Date(), 'PP, pp');
        return this.pastedFileName(t('conversationSendPastedFile', date));
      }

      this.pastedFilePreviewUrl(null);
      this.pastedFileName(null);
    });

    this.hasLocalEphemeralTimer = ko.pureComputed(() => {
      const conversationEntity = this.conversationEntity();
      return conversationEntity.localMessageTimer() && !conversationEntity.hasGlobalMessageTimer();
    });

    this.conversationEntity.subscribe(this.loadInitialStateForConversation);
    this.draftMessage.subscribe(message => {
      if (this.conversationEntity()) {
        this._saveDraftState(this.conversationEntity(), message.text, message.mentions, message.reply);
      }
    });

    this.renderMessage = renderMessage;

    this._initSubscriptions();
  }

  private readonly _initSubscriptions = (): void => {
    amplify.subscribe(WebAppEvents.CONVERSATION.IMAGE.SEND, this.uploadImages);
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.EDIT, this.editMessage);
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.REPLY, this.replyMessage);
    amplify.subscribe(WebAppEvents.EXTENSIONS.GIPHY.SEND, this.sendGiphy);
    amplify.subscribe(WebAppEvents.SEARCH.SHOW, () => this.conversationHasFocus(false));
    amplify.subscribe(WebAppEvents.SEARCH.HIDE, () => {
      window.requestAnimationFrame(() => this.conversationHasFocus(true));
    });
  };

  setElements = (nodes: HTMLElement[]): void => {
    this.textarea = nodes.find(node => node.id === 'conversation-input-bar-text') as HTMLTextAreaElement;
    this.shadowInput = nodes.find(node => node.classList?.contains('shadow-input')) as HTMLDivElement;
    this.updateSelectionState();
  };

  loadInitialStateForConversation = async (conversationEntity: Conversation): Promise<void> => {
    this.conversationHasFocus(true);
    this.pastedFile(null);
    this.cancelMessageEditing();
    this.cancelMessageReply();
    this.endMentionFlow();

    if (conversationEntity) {
      const previousSessionData = await this._loadDraftState(conversationEntity);
      this.input(previousSessionData.text);
      this.currentMentions(previousSessionData.mentions);
      this.updateSelectionState();

      if (previousSessionData.replyEntityPromise) {
        previousSessionData.replyEntityPromise.then(replyEntity => {
          if (replyEntity?.isReplyable()) {
            this.replyMessageEntity(replyEntity);
          }
        });
      }
    }
  };

  private readonly _saveDraftState = async (
    conversationEntity: Conversation,
    text: string,
    mentions: MentionEntity[],
    reply: ContentMessage,
  ): Promise<void> => {
    if (this.isEditing()) {
      return;
    }
    // we only save state for newly written messages
    const storeReply = reply?.id ? {messageId: reply.id} : {};
    const storageKey = this._generateStorageKey(conversationEntity);
    await this.storageRepository.storageService.saveToSimpleStorage<Draft>(storageKey, {
      mentions,
      reply: storeReply,
      text,
    });
  };

  private readonly _generateStorageKey = (conversationEntity: Conversation): string => {
    return `${StorageKey.CONVERSATION.INPUT}|${conversationEntity.id}`;
  };

  private readonly _loadDraftState = async (conversationEntity: Conversation): Promise<DraftMessage> => {
    const storageKey = this._generateStorageKey(conversationEntity);
    const storageValue = await this.storageRepository.storageService.loadFromSimpleStorage<Draft>(storageKey);

    if (typeof storageValue === 'undefined') {
      return {mentions: [], reply: {} as ContentMessage, text: ''};
    }

    if (typeof storageValue === 'string') {
      return {mentions: [], reply: {} as ContentMessage, text: storageValue};
    }

    const draftMessage: DraftMessage = {...(storageValue as DraftMessage)};

    draftMessage.mentions = draftMessage.mentions.map(mention => {
      return new MentionEntity(mention.startIndex, mention.length, mention.userId);
    });

    const replyMessageId = draftMessage.reply
      ? ((draftMessage.reply as unknown) as {messageId: string}).messageId
      : undefined;

    if (replyMessageId) {
      draftMessage.replyEntityPromise = this.messageRepository.getMessageInConversationById(
        conversationEntity,
        replyMessageId,
        false,
        true,
      );
    }

    return draftMessage;
  };

  private readonly _resetDraftState = (): void => {
    this.currentMentions.removeAll();
    this.input('');
  };

  private readonly _createMentionEntity = (userEntity: User): MentionEntity => {
    const mentionLength = userEntity.name().length + 1;
    return new MentionEntity(this.editedMention().startIndex, mentionLength, userEntity.id);
  };

  addMention = (userEntity: User, inputElement: HTMLInputElement): void => {
    const mentionEntity = this._createMentionEntity(userEntity);

    // keep track of what is before and after the mention being edited
    const beforeMentionPartial = this.input().slice(0, mentionEntity.startIndex);
    const afterMentionPartial = this.input()
      .slice(mentionEntity.startIndex + this.editedMention().term.length + 1)
      .replace(/^ /, '');

    // insert the mention in between
    this.input(`${beforeMentionPartial}@${userEntity.name()} ${afterMentionPartial}`);

    this.currentMentions.push(mentionEntity);
    this.currentMentions.sort((mentionA, mentionB) => mentionA.startIndex - mentionB.startIndex);

    const caretPosition = mentionEntity.endIndex + 1;
    inputElement.selectionStart = caretPosition;
    inputElement.selectionEnd = caretPosition;
    this.endMentionFlow();
  };

  endMentionFlow = (): void => {
    this.editedMention(undefined);
    this.updateSelectionState();
  };

  addedToView = (): void => {
    amplify.subscribe(WebAppEvents.SHORTCUT.PING, this.clickToPing);
  };

  cancelMessageEditing = (resetDraft = true): void => {
    this.editMessageEntity(undefined);
    this.replyMessageEntity(undefined);
    if (resetDraft) {
      this._resetDraftState();
    }
  };

  cancelMessageReply = (resetDraft = true): void => {
    this.replyMessageEntity(undefined);
    if (resetDraft) {
      this._resetDraftState();
    }
  };

  handleCancelReply = (): void => {
    if (!this.mentionSuggestions().length) {
      this.cancelMessageReply(false);
    }
    this.textarea.focus();
  };

  clickToCancelPastedFile = (): void => {
    this.pastedFile(null);
  };

  clickToShowGiphy = (): void => {
    amplify.publish(WebAppEvents.EXTENSIONS.GIPHY.SHOW, this.input());
  };

  clickToPing = (): void => {
    if (this.conversationEntity() && !this.pingDisabled()) {
      this.pingDisabled(true);
      this.messageRepository.sendKnock(this.conversationEntity()).then(() => {
        window.setTimeout(() => this.pingDisabled(false), InputBarViewModel.CONFIG.PING_TIMEOUT);
      });
    }
  };

  editMessage = (messageEntity: ContentMessage): void => {
    if (messageEntity?.is_editable() && messageEntity !== this.editMessageEntity()) {
      this.cancelMessageReply();
      this.cancelMessageEditing();
      this.editMessageEntity(messageEntity);
      this.input((messageEntity.get_first_asset() as Text).text);
      const newMentions = (messageEntity.get_first_asset() as Text).mentions().slice();
      this.currentMentions(newMentions);

      if (messageEntity.quote()) {
        this.messageRepository
          .getMessageInConversationById(this.conversationEntity(), messageEntity.quote().messageId)
          .then(quotedMessage => this.replyMessageEntity(quotedMessage));
      }

      this._moveCursorToEnd();
    }
  };

  replyMessage = (messageEntity: ContentMessage): void => {
    if (messageEntity?.isReplyable() && messageEntity !== this.replyMessageEntity()) {
      this.cancelMessageReply(false);
      this.cancelMessageEditing(!!this.editMessageEntity());
      this.replyMessageEntity(messageEntity);
      this.textarea.focus();
    }
  };

  onDropFiles = (droppedFiles: File[]): void => {
    const images: File[] = [];
    const files: File[] = [];

    const tooManyConcurrentUploads = this._isHittingUploadLimit(droppedFiles);
    if (tooManyConcurrentUploads) {
      return;
    }

    const allowedImageTypes = Config.getConfig().ALLOWED_IMAGE_TYPES;

    Array.from(droppedFiles).forEach((file): void | number => {
      const isSupportedImage = allowedImageTypes.includes(file.type);
      if (isSupportedImage) {
        return images.push(file);
      }
      files.push(file);
    });

    this.uploadImages(images);
    this.uploadFiles(files);
  };

  onPasteFiles = (pastedFiles: File[]): void => {
    const [pastedFile] = pastedFiles;
    this.pastedFile(pastedFile);
  };

  onWindowClick = (event: Event): void => {
    if ($(event.target).closest('.conversation-input-bar, .conversation-input-bar-mention-suggestion').length) {
      return;
    }
    this.cancelMessageEditing();
    this.cancelMessageReply();
  };

  onInputEnter = (data: unknown, event: Event): void | boolean => {
    if (this.pastedFile()) {
      return this.sendPastedFile();
    }

    const beforeLength = this.input().length;
    const messageTrimmedStart = this.input().trimLeft();
    const afterLength = messageTrimmedStart.length;

    const updatedMentions = this.updateMentionRanges(this.currentMentions(), 0, 0, afterLength - beforeLength);
    this.currentMentions(updatedMentions);

    const messageText = messageTrimmedStart.trimRight();

    const isMessageTextTooLong = messageText.length > Config.getConfig().MAXIMUM_MESSAGE_LENGTH;
    if (isMessageTextTooLong) {
      return amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, {
        text: {
          message: t('modalConversationMessageTooLongMessage', Config.getConfig().MAXIMUM_MESSAGE_LENGTH),
          title: t('modalConversationMessageTooLongHeadline'),
        },
      });
    }

    if (this.isEditing()) {
      this.sendMessageEdit(messageText, this.editMessageEntity());
    } else {
      this.sendMessage(messageText, this.replyMessageEntity());
    }

    this._resetDraftState();
    $(event.target).focus();
  };

  onInputKeyDown = (data: unknown, keyboardEvent: KeyboardEvent): void | boolean => {
    const inputHandledByEmoji = !this.editedMention() && this.emojiInput.onInputKeyDown(data, keyboardEvent);

    if (!inputHandledByEmoji) {
      switch (keyboardEvent.key) {
        case KEY.ARROW_UP: {
          if (!isFunctionKey(keyboardEvent) && !this.input().length) {
            this.editMessage(this.conversationEntity().get_last_editable_message() as ContentMessage);
            this.updateMentions(data, keyboardEvent);
          }
          break;
        }

        case KEY.ESC: {
          if (this.mentionSuggestions().length) {
            this.endMentionFlow();
          } else if (this.pastedFile()) {
            this.pastedFile(null);
          } else if (this.isEditing()) {
            this.cancelMessageEditing();
          } else if (this.isReplying()) {
            this.cancelMessageReply(false);
          }
          break;
        }

        case KEY.ENTER: {
          if (keyboardEvent.altKey || keyboardEvent.metaKey) {
            insertAtCaret(keyboardEvent.target.toString(), '\n');
            ko.utils.triggerEvent(keyboardEvent.target as Element, 'change');
            keyboardEvent.preventDefault();
          }
          break;
        }

        default:
          break;
      }

      return true;
    }
  };

  getMentionCandidate = (
    selectionStart: number,
    selectionEnd: number,
    value: string,
  ): {startIndex: number; term: string} => {
    const textInSelection = value.substring(selectionStart, selectionEnd);
    const wordBeforeSelection = value.substring(0, selectionStart).replace(/[^]*\s/, '');
    const isSpaceSelected = /\s/.test(textInSelection);

    const startOffset = wordBeforeSelection.length ? wordBeforeSelection.length - 1 : 1;
    const isSelectionStartMention = this.findMentionAtPosition(selectionStart - startOffset, this.currentMentions());
    const isSelectionEndMention = this.findMentionAtPosition(selectionEnd, this.currentMentions());
    const isOverMention = isSelectionStartMention || isSelectionEndMention;
    const isOverValidMentionString = /^@\S*$/.test(wordBeforeSelection);

    if (!isSpaceSelected && !isOverMention && isOverValidMentionString) {
      const wordAfterSelection = value.substring(selectionEnd).replace(/\s[^]*/, '');

      const term = `${wordBeforeSelection.replace(/^@/, '')}${textInSelection}${wordAfterSelection}`;
      const startIndex = selectionStart - wordBeforeSelection.length;
      return {startIndex, term};
    }

    return undefined;
  };

  handleMentionFlow = (): void => {
    const {selectionStart, selectionEnd, value} = this.textarea;
    const mentionCandidate = this.getMentionCandidate(selectionStart, selectionEnd, value);
    this.editedMention(mentionCandidate);
    this.updateSelectionState();
  };

  updateSelectionState = (): void => {
    if (!this.textarea) {
      return;
    }
    const {selectionStart, selectionEnd} = this.textarea;
    const defaultRange = {endIndex: 0, startIndex: Infinity};

    const firstMention = this.findMentionAtPosition(selectionStart, this.currentMentions()) || defaultRange;
    const lastMention = this.findMentionAtPosition(selectionEnd, this.currentMentions()) || defaultRange;

    const mentionStart = Math.min(firstMention.startIndex, lastMention.startIndex);
    const mentionEnd = Math.max(firstMention.endIndex, lastMention.endIndex);

    const newStart = Math.min(mentionStart, selectionStart);
    const newEnd = Math.max(mentionEnd, selectionEnd);
    if (newStart !== selectionStart || newEnd !== selectionEnd) {
      this.textarea.selectionStart = newStart;
      this.textarea.selectionEnd = newEnd;
    }
    this.selectionStart(newStart);
    this.selectionEnd(newEnd);
  };

  updateMentions = (data: unknown, event: Event): void => {
    const textarea = event.target as HTMLTextAreaElement;
    const value = textarea.value;
    const previousValue = this.input();

    const lengthDifference = value.length - previousValue.length;
    const edgeMention = this.detectMentionEdgeDeletion(textarea, lengthDifference);
    if (edgeMention) {
      textarea.value = this.input();
      textarea.selectionStart = edgeMention.startIndex;
      textarea.selectionEnd = edgeMention.endIndex;
    }
  };

  detectMentionEdgeDeletion = (textarea: HTMLTextAreaElement, lengthDifference: number): MentionEntity => {
    const hadSelection = this.selectionStart() !== this.selectionEnd();
    if (hadSelection) {
      return null;
    }
    if (lengthDifference >= 0) {
      return null;
    }
    const currentSelectionStart = textarea.selectionStart;
    const forwardDeleted = currentSelectionStart === this.selectionStart();
    const checkPosition = forwardDeleted ? currentSelectionStart + 1 : currentSelectionStart;
    return this.findMentionAtPosition(checkPosition, this.currentMentions());
  };

  updateMentionRanges = (
    mentions: MentionEntity[],
    start: number,
    end: number,
    difference: number,
  ): MentionEntity[] => {
    const remainingMentions = mentions.filter(({startIndex, endIndex}) => endIndex <= start || startIndex >= end);

    remainingMentions.forEach(mention => {
      if (mention.startIndex >= end) {
        mention.startIndex += difference;
      }
    });

    return remainingMentions;
  };

  findMentionAtPosition = (position: number, mentions: MentionEntity[]): MentionEntity => {
    return mentions.find(({startIndex, endIndex}) => position > startIndex && position < endIndex);
  };

  onInputKeyUp = (data: unknown, keyboardEvent: KeyboardEvent): void => {
    if (!this.editedMention()) {
      this.emojiInput.onInputKeyUp(data, keyboardEvent);
    }
    if (keyboardEvent.key !== KEY.ESC) {
      this.handleMentionFlow();
    }
  };

  removedFromView = (): void => {
    amplify.unsubscribeAll(WebAppEvents.SHORTCUT.PING);
  };

  triggerInputChangeEvent = (newInputHeight = 0, previousInputHeight = 0): void => {
    amplify.publish(WebAppEvents.INPUT.RESIZE, newInputHeight - previousInputHeight);
  };

  sendGiphy = (gifUrl: string, tag: string): void => {
    const conversationEntity = this.conversationEntity();
    const replyMessageEntity = this.replyMessageEntity();
    this._generateQuote(replyMessageEntity).then(quoteEntity => {
      this.messageRepository.sendGif(conversationEntity, gifUrl, tag, quoteEntity);
      this.cancelMessageEditing(true);
    });
  };

  private readonly _generateQuote = (replyMessageEntity: ContentMessage): Promise<QuoteEntity | undefined> => {
    return !replyMessageEntity
      ? Promise.resolve(undefined)
      : this.eventRepository.eventService
          .loadEvent(replyMessageEntity.conversation_id, replyMessageEntity.id)
          .then(MessageHasher.hashEvent)
          .then((messageHash: ArrayBuffer) => {
            return new QuoteEntity({
              hash: messageHash,
              messageId: replyMessageEntity.id,
              userId: replyMessageEntity.from,
            });
          });
  };

  sendMessage = (messageText: string, replyMessageEntity: ContentMessage): void => {
    if (!messageText.length) {
      return;
    }

    const mentionEntities = this.currentMentions.slice(0);
    this._generateQuote(replyMessageEntity).then(quoteEntity => {
      this.messageRepository.sendTextWithLinkPreview(
        this.conversationEntity(),
        messageText,
        mentionEntities,
        quoteEntity,
      );
      this.cancelMessageReply();
    });
  };

  sendMessageEdit = (messageText: string, messageEntity: ContentMessage): void | Promise<any> => {
    const mentionEntities = this.currentMentions.slice(0);
    this.cancelMessageEditing();

    if (!messageText.length) {
      return this.messageRepository.deleteMessageForEveryone(this.conversationEntity(), messageEntity);
    }

    this.messageRepository
      .sendMessageEdit(this.conversationEntity(), messageText, messageEntity, mentionEntities)
      .catch(error => {
        if (error.type !== ConversationError.TYPE.NO_MESSAGE_CHANGES) {
          throw error;
        }
      });
    this.cancelMessageReply();
  };

  sendPastedFile = (): void => {
    this.onDropFiles([this.pastedFile()]);
    this.pastedFile(null);
  };

  uploadImages = (images: File[]): void => {
    if (!this._isHittingUploadLimit(images)) {
      for (const image of Array.from(images)) {
        const isTooLarge = image.size > Config.getConfig().MAXIMUM_IMAGE_FILE_SIZE;
        if (isTooLarge) {
          return this._showUploadWarning(image);
        }
      }

      this.messageRepository.upload_images(this.conversationEntity(), images);
    }
  };

  uploadFiles = (files: File[]): void | boolean => {
    const fileArray = Array.from(files);
    if (!allowsAllFiles()) {
      for (const file of fileArray) {
        if (!hasAllowedExtension(file.name)) {
          this.conversationRepository.injectFileTypeRestrictedMessage(
            this.conversationEntity(),
            this.selfUser(),
            false,
            getFileExtensionOrName(file.name),
          );
          return false;
        }
      }
    }

    const uploadLimit = this.selfUser().inTeam()
      ? Config.getConfig().MAXIMUM_ASSET_FILE_SIZE_TEAM
      : Config.getConfig().MAXIMUM_ASSET_FILE_SIZE_PERSONAL;
    if (!this._isHittingUploadLimit(files)) {
      for (const file of fileArray) {
        const isTooLarge = file.size > uploadLimit;
        if (isTooLarge) {
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

      this.messageRepository.upload_files(this.conversationEntity(), files);
    }
  };

  private readonly _isHittingUploadLimit = (files: File[]): boolean => {
    const concurrentUploadLimit = InputBarViewModel.CONFIG.ASSETS.CONCURRENT_UPLOAD_LIMIT;
    const concurrentUploads = files.length + this.assetRepository.getNumberOfOngoingUploads();
    const isHittingUploadLimit = concurrentUploads > InputBarViewModel.CONFIG.ASSETS.CONCURRENT_UPLOAD_LIMIT;

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

  private readonly _moveCursorToEnd = (): void => {
    afterRender(() => {
      if (this.textarea) {
        const endPosition = this.textarea.value.length;
        this.textarea.setSelectionRange(endPosition, endPosition);
        this.updateSelectionState();
      }
    });
  };

  private readonly _showUploadWarning = (image: File): void => {
    const isGif = image.type === 'image/gif';
    const maxSize = Config.getConfig().MAXIMUM_IMAGE_FILE_SIZE / 1024 / 1024;
    const message = isGif ? t('modalGifTooLargeMessage', maxSize) : t('modalPictureTooLargeMessage', maxSize);
    const title = isGif ? t('modalGifTooLargeHeadline') : t('modalPictureTooLargeHeadline');

    const modalOptions = {
      text: {
        message,
        title,
      },
    };

    amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, modalOptions);
  };
}
