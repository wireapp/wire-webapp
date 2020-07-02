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
import {renderMessage} from 'Util/messageRenderer';
import {KEY, isFunctionKey, insertAtCaret} from 'Util/KeyboardUtil';
import {ParticipantAvatar} from 'Components/participantAvatar';

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
import {UserRepository} from 'src/script/user/UserRepository';
import {EmojiInputViewModel} from './EmojiInputViewModel';
import {User} from 'src/script/entity/User';
import {Conversation} from 'src/script/entity/Conversation';
import {Text} from 'src/script/entity/message/Text';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {Asset} from 'src/script/entity/message/Asset';
import {FileAsset} from 'src/script/entity/message/FileAsset';
import {MediumImage} from 'src/script/entity/message/MediumImage';

type DraftMessage = {
  mentions: MentionEntity[];
  reply: ContentMessage;
  replyEntityPromise?: Promise<ContentMessage>;
  text: string;
};

export class InputBarViewModel {
  shadowInput: HTMLDivElement;
  textarea: HTMLTextAreaElement;
  selectionStart: ko.Observable<number>;
  selectionEnd: ko.Observable<number>;
  participantAvatarSize = ParticipantAvatar.SIZE.X_SMALL;
  conversationEntity: ko.Observable<Conversation>;
  selfUser: ko.Observable<User>;
  conversationHasFocus: ko.Observable<boolean>;
  editMessageEntity: ko.Observable<ContentMessage>;
  replyMessageEntity: ko.Observable<ContentMessage>;
  replyAsset: ko.PureComputed<Asset | FileAsset | Text | MediumImage>;
  isEditing: ko.PureComputed<boolean>;
  isReplying: ko.PureComputed<boolean>;
  replyMessageId: ko.PureComputed<string>;
  pastedFile: ko.Observable<File>;
  pastedFilePreviewUrl: ko.Observable<string>;
  pastedFileName: ko.Observable<string>;
  pingDisabled: ko.Observable<boolean>;
  editedMention: ko.Observable<{startIndex: number; term: string}>;
  currentMentions: ko.ObservableArray<MentionEntity>;
  hasFocus: ko.PureComputed<boolean>;
  hasTextInput: ko.PureComputed<boolean>;
  draftMessage: ko.PureComputed<DraftMessage>;
  mentionSuggestions: ko.PureComputed<User[]>;
  richTextInput: ko.PureComputed<string>;
  inputPlaceholder: ko.PureComputed<string>;
  showGiphyButton: ko.PureComputed<boolean>;
  pingTooltip: string;
  hasLocalEphemeralTimer: ko.PureComputed<boolean>;
  renderMessage: typeof renderMessage;
  input: ko.Observable<string>;
  showAvailabilityTooltip: ko.PureComputed<boolean>;

  static get CONFIG() {
    return {
      ASSETS: {
        CONCURRENT_UPLOAD_LIMIT: 10,
      },
      FILES: {
        ALLOWED_FILE_UPLOAD_EXTENSIONS: Config.getConfig().FEATURE.ALLOWED_FILE_UPLOAD_EXTENSIONS,
      },
      GIPHY_TEXT_LENGTH: 256,
      IMAGE: {
        FILE_TYPES: ['image/bmp', 'image/gif', 'image/jpeg', 'image/jpg', 'image/png', '.jpg-large'],
      },
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
    private readonly userRepository: UserRepository,
  ) {
    this.shadowInput = null;
    this.textarea = null;

    this.selectionStart = ko.observable(0);
    this.selectionEnd = ko.observable(0);

    this.conversationEntity = this.conversationRepository.active_conversation;
    this.selfUser = this.userRepository.self;

    this.conversationHasFocus = ko.observable(true).extend({notify: 'always'});

    this.editMessageEntity = ko.observable();
    this.replyMessageEntity = ko.observable();

    const handleRepliedMessageDeleted = (messageId: string) => {
      if (this.replyMessageEntity() && this.replyMessageEntity().id === messageId) {
        this.replyMessageEntity(undefined);
      }
    };

    const handleRepliedMessageUpdated = (originalMessageId: string, messageEntity: ContentMessage) => {
      if (this.replyMessageEntity() && this.replyMessageEntity().id === originalMessageId) {
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
      return this.replyMessageEntity() && this.replyMessageEntity().assets() && this.replyMessageEntity().assets()[0];
    });

    this.isEditing = ko.pureComputed(() => !!this.editMessageEntity());
    this.isReplying = ko.pureComputed(() => !!this.replyMessageEntity());
    this.replyMessageId = ko.pureComputed(() => (this.replyMessageEntity() ? this.replyMessageEntity().id : undefined));

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
        const availabilityStrings: {[key in string]: string} = {
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
      if (this.conversationEntity() && this.conversationEntity().firstUserEntity()) {
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
        const isSupportedFileType = InputBarViewModel.CONFIG.IMAGE.FILE_TYPES.includes(blob.type);
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

  _initSubscriptions() {
    amplify.subscribe(WebAppEvents.CONVERSATION.IMAGE.SEND, this.uploadImages);
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.EDIT, this.editMessage);
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.REPLY, this.replyMessage);
    amplify.subscribe(WebAppEvents.EXTENSIONS.GIPHY.SEND, this.sendGiphy);
    amplify.subscribe(WebAppEvents.SEARCH.SHOW, () => this.conversationHasFocus(false));
    amplify.subscribe(WebAppEvents.SEARCH.HIDE, () => {
      window.requestAnimationFrame(() => this.conversationHasFocus(true));
    });
  }

  setElements(nodes: HTMLElement[]) {
    this.textarea = nodes.find(node => node.id === 'conversation-input-bar-text') as HTMLTextAreaElement;
    this.shadowInput = nodes.find(node => node.classList && node.classList.contains('shadow-input')) as HTMLDivElement;
    this.updateSelectionState();
  }

  async loadInitialStateForConversation(conversationEntity: Conversation) {
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
          if (replyEntity && replyEntity.isReplyable()) {
            this.replyMessageEntity(replyEntity);
          }
        });
      }
    }
  }

  async _saveDraftState(
    conversationEntity: Conversation,
    text: string,
    mentions: MentionEntity[],
    reply: ContentMessage,
  ) {
    if (!this.isEditing()) {
      // we only save state for newly written messages
      const updatedReply = reply && reply.id ? {messageId: reply.id} : {};
      const storageKey = this._generateStorageKey(conversationEntity);
      await this.storageRepository.storageService.saveToSimpleStorage(storageKey, {mentions, text, updatedReply});
    }
  }

  _generateStorageKey(conversationEntity: Conversation) {
    return `${StorageKey.CONVERSATION.INPUT}|${conversationEntity.id}`;
  }

  _loadDraftState = async (conversationEntity: Conversation): Promise<DraftMessage> => {
    const storageKey = this._generateStorageKey(conversationEntity);
    const storageValue = await this.storageRepository.storageService.loadFromSimpleStorage(storageKey);

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
      draftMessage.replyEntityPromise = this.conversationRepository.getMessageInConversationById(
        conversationEntity,
        replyMessageId,
        false,
        true,
      );
    }

    return draftMessage;
  };

  _resetDraftState() {
    this.currentMentions.removeAll();
    this.input('');
  }

  _createMentionEntity(userEntity: User) {
    const mentionLength = userEntity.name().length + 1;
    return new MentionEntity(this.editedMention().startIndex, mentionLength, userEntity.id);
  }

  addMention(userEntity: User, inputElement: HTMLInputElement) {
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
  }

  endMentionFlow() {
    this.editedMention(undefined);
    this.updateSelectionState();
  }

  addedToView() {
    amplify.subscribe(WebAppEvents.SHORTCUT.PING, this.clickToPing);
  }

  cancelMessageEditing(resetDraft = true) {
    this.editMessageEntity(undefined);
    this.replyMessageEntity(undefined);
    if (resetDraft) {
      this._resetDraftState();
    }
  }

  cancelMessageReply(resetDraft = true) {
    this.replyMessageEntity(undefined);
    if (resetDraft) {
      this._resetDraftState();
    }
  }

  handleCancelReply() {
    if (!this.mentionSuggestions().length) {
      this.cancelMessageReply(false);
    }
    this.textarea.focus();
  }

  clickToCancelPastedFile() {
    this.pastedFile(null);
  }

  clickToShowGiphy() {
    amplify.publish(WebAppEvents.EXTENSIONS.GIPHY.SHOW, this.input());
  }

  clickToPing() {
    if (this.conversationEntity() && !this.pingDisabled()) {
      this.pingDisabled(true);
      this.conversationRepository.sendKnock(this.conversationEntity()).then(() => {
        window.setTimeout(() => this.pingDisabled(false), InputBarViewModel.CONFIG.PING_TIMEOUT);
      });
    }
  }

  editMessage(messageEntity: ContentMessage) {
    if (messageEntity && messageEntity.is_editable() && messageEntity !== this.editMessageEntity()) {
      this.cancelMessageReply();
      this.cancelMessageEditing();
      this.editMessageEntity(messageEntity);
      this.input((messageEntity.get_first_asset() as Text).text);
      const newMentions = (messageEntity.get_first_asset() as Text).mentions().slice();
      this.currentMentions(newMentions);

      if (messageEntity.quote()) {
        this.conversationRepository
          .getMessageInConversationById(this.conversationEntity(), messageEntity.quote().messageId)
          .then(quotedMessage => this.replyMessageEntity(quotedMessage));
      }

      this._moveCursorToEnd();
    }
  }

  replyMessage(messageEntity: ContentMessage) {
    if (messageEntity && messageEntity.isReplyable() && messageEntity !== this.replyMessageEntity()) {
      this.cancelMessageReply(false);
      this.cancelMessageEditing(!!this.editMessageEntity());
      this.replyMessageEntity(messageEntity);
      this.textarea.focus();
    }
  }

  onDropFiles(droppedFiles: File[]) {
    const images: File[] = [];
    const files: File[] = [];

    const tooManyConcurrentUploads = this._isHittingUploadLimit(droppedFiles);
    if (!tooManyConcurrentUploads) {
      Array.from(droppedFiles).forEach((file): void | number => {
        const isSupportedImage = InputBarViewModel.CONFIG.IMAGE.FILE_TYPES.includes(file.type);
        if (isSupportedImage) {
          return images.push(file);
        }
        files.push(file);
      });

      this.uploadImages(images);
      this.uploadFiles(files);
    }
  }

  onPasteFiles(pastedFiles: File[]) {
    const [pastedFile] = pastedFiles;
    this.pastedFile(pastedFile);
  }

  onWindowClick(event: Event) {
    if (!$(event.target).closest('.conversation-input-bar, .conversation-input-bar-mention-suggestion').length) {
      this.cancelMessageEditing();
      this.cancelMessageReply();
    }
  }

  onInputEnter(data: unknown, event: Event) {
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
  }

  onInputKeyDown(data: unknown, keyboardEvent: KeyboardEvent): void | boolean {
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
  }

  /**
   * Returns a term which is a mention match together with its starting position.
   * If nothing could be matched, it returns `undefined`.
   *
   * @param {number} selectionStart Current caret position or start of selection  (if text is marked)
   * @param {number} selectionEnd Current caret position or end of selection (if text is marked)
   * @param {string} value Text input
   * @returns {undefined|{startIndex: number, term: string}} Matched mention info
   */
  getMentionCandidate(selectionStart: number, selectionEnd: number, value: string) {
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
  }

  handleMentionFlow() {
    const {selectionStart, selectionEnd, value} = this.textarea;
    const mentionCandidate = this.getMentionCandidate(selectionStart, selectionEnd, value);
    this.editedMention(mentionCandidate);
    this.updateSelectionState();
  }

  updateSelectionState() {
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
  }

  updateMentions(data: unknown, event: Event) {
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
  }

  detectMentionEdgeDeletion(textarea: HTMLTextAreaElement, lengthDifference: number) {
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
  }

  updateMentionRanges(mentions: MentionEntity[], start: number, end: number, difference: number) {
    const remainingMentions = mentions.filter(({startIndex, endIndex}) => endIndex <= start || startIndex >= end);

    remainingMentions.forEach(mention => {
      if (mention.startIndex >= end) {
        mention.startIndex += difference;
      }
    });

    return remainingMentions;
  }

  findMentionAtPosition(position: number, mentions: MentionEntity[]) {
    return mentions.find(({startIndex, endIndex}) => position > startIndex && position < endIndex);
  }

  onInputKeyUp(data: unknown, keyboardEvent: KeyboardEvent) {
    if (!this.editedMention()) {
      this.emojiInput.onInputKeyUp(data, keyboardEvent);
    }
    if (keyboardEvent.key !== KEY.ESC) {
      this.handleMentionFlow();
    }
  }

  removedFromView() {
    amplify.unsubscribeAll(WebAppEvents.SHORTCUT.PING);
  }

  triggerInputChangeEvent(newInputHeight = 0, previousInputHeight = 0) {
    amplify.publish(WebAppEvents.INPUT.RESIZE, newInputHeight - previousInputHeight);
  }

  sendGiphy(gifUrl: string, tag: string) {
    const conversationEntity = this.conversationEntity();
    const replyMessageEntity = this.replyMessageEntity();
    this._generateQuote(replyMessageEntity).then(quoteEntity => {
      this.conversationRepository.sendGif(conversationEntity, gifUrl, tag, quoteEntity);
      this.cancelMessageEditing(true);
    });
  }

  _generateQuote(replyMessageEntity: ContentMessage): Promise<QuoteEntity> {
    return !replyMessageEntity
      ? Promise.resolve()
      : this.eventRepository
          .loadEvent(replyMessageEntity.conversation_id, replyMessageEntity.id)
          .then(MessageHasher.hashEvent)
          .then((messageHash: ArrayBuffer) => {
            return new QuoteEntity({
              hash: messageHash,
              messageId: replyMessageEntity.id,
              userId: replyMessageEntity.from,
            });
          });
  }

  sendMessage(messageText: string, replyMessageEntity: ContentMessage) {
    if (messageText.length) {
      const mentionEntities = this.currentMentions.slice(0);

      this._generateQuote(replyMessageEntity).then(quoteEntity => {
        this.conversationRepository.sendTextWithLinkPreview(
          this.conversationEntity(),
          messageText,
          mentionEntities,
          quoteEntity,
        );
        this.cancelMessageReply();
      });
    }
  }

  sendMessageEdit(messageText: string, messageEntity: ContentMessage): void | Promise<any> {
    const mentionEntities = this.currentMentions.slice(0);
    this.cancelMessageEditing();

    if (!messageText.length) {
      return this.conversationRepository.deleteMessageForEveryone(this.conversationEntity(), messageEntity);
    }

    this.conversationRepository
      .sendMessageEdit(this.conversationEntity(), messageText, messageEntity, mentionEntities)
      .catch(error => {
        if (error.type !== ConversationError.TYPE.NO_MESSAGE_CHANGES) {
          throw error;
        }
      });
    this.cancelMessageReply();
  }

  sendPastedFile() {
    this.onDropFiles([this.pastedFile()]);
    this.pastedFile(null);
  }

  /**
   * Post images to a conversation.
   * @param {Array|FileList} images Images
   * @returns {undefined} No return value
   */
  uploadImages(images: File[]) {
    if (!this._isHittingUploadLimit(images)) {
      for (const image of Array.from(images)) {
        const isTooLarge = image.size > Config.getConfig().MAXIMUM_IMAGE_FILE_SIZE;
        if (isTooLarge) {
          return this._showUploadWarning(image);
        }
      }

      this.conversationRepository.upload_images(this.conversationEntity(), images);
    }
  }

  /**
   * Post files to a conversation.
   * @param {Array|FileList} files Files
   * @returns {undefined} No return value
   */
  uploadFiles(files: File[]): void | boolean {
    const fileArray = Array.from(files);
    const allowedFileUploadExtensions = InputBarViewModel.CONFIG.FILES.ALLOWED_FILE_UPLOAD_EXTENSIONS;
    const allowAllExtensions = allowedFileUploadExtensions.some(extension => ['*', '.*', '*.*'].includes(extension));

    if (!allowAllExtensions) {
      // Creates a regex like this: (\.txt|\.pdf)$
      const fileNameRegex = new RegExp(`(\\${allowedFileUploadExtensions.join('|\\')})$`);

      for (const file of fileArray) {
        const allowedFiletype = fileNameRegex.test(file.name.toLowerCase());

        if (!allowedFiletype) {
          const options = {
            text: {
              message: t('modalAssetFileTypeRestrictionMessage', file.name),
              title: t('modalAssetFileTypeRestrictionHeadline'),
            },
          };

          return amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, options);
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

      this.conversationRepository.upload_files(this.conversationEntity(), files);
    }
  }

  _isHittingUploadLimit(files: File[]) {
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
  }

  _moveCursorToEnd() {
    afterRender(() => {
      if (this.textarea) {
        const endPosition = this.textarea.value.length;
        this.textarea.setSelectionRange(endPosition, endPosition);
        this.updateSelectionState();
      }
    });
  }

  _showUploadWarning(image: File) {
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
  }
}
