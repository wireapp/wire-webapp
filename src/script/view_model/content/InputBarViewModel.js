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

import moment from 'moment';
import {Availability} from '@wireapp/protocol-messaging';

import {getLogger} from 'Util/Logger';
import {t} from 'Util/LocalizerUtil';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {afterRender, formatBytes} from 'Util/util';
import {renderMessage} from 'Util/messageRenderer';

import {KEY, isFunctionKey, insertAtCaret} from 'Util/KeyboardUtil';
import {escapeString} from 'Util/SanitizationUtil';

import {resolve, graph} from '../../config/appResolver';
import {ModalsViewModel} from '../ModalsViewModel';
import {ParticipantAvatar} from 'Components/participantAvatar';

import {StorageKey} from '../../storage/StorageKey';
import {WebAppEvents} from '../../event/WebApp';

import {QuoteEntity} from '../../message/QuoteEntity';
import {MessageHasher} from '../../message/MessageHasher';
import {MentionEntity} from '../../message/MentionEntity';

import {Shortcut} from '../../ui/Shortcut';
import {ShortcutType} from '../../ui/ShortcutType';
import {Config} from '../../Config';
import {AssetUploader} from '../../assets/AssetUploader';
import {AssetService} from '../../assets/AssetService';

window.z = window.z || {};
window.z.viewModel = z.viewModel || {};
window.z.viewModel.content = z.viewModel.content || {};

// Parent: ContentViewModel
z.viewModel.content.InputBarViewModel = class InputBarViewModel {
  static get CONFIG() {
    return {
      ASSETS: {
        CONCURRENT_UPLOAD_LIMIT: 10,
      },
      FILES: {
        ALLOWED_FILE_UPLOAD_EXTENSIONS: Config.FEATURE.ALLOWED_FILE_UPLOAD_EXTENSIONS,
      },
      GIPHY_TEXT_LENGTH: 256,
      IMAGE: {
        FILE_TYPES: ['image/bmp', 'image/gif', 'image/jpeg', 'image/jpg', 'image/png', '.jpg-large'],
      },
      PING_TIMEOUT: TIME_IN_MILLIS.SECOND * 2,
    };
  }

  constructor(mainViewModel, contentViewModel, repositories) {
    this.addedToView = this.addedToView.bind(this);
    this.addMention = this.addMention.bind(this);
    this.clickToPing = this.clickToPing.bind(this);
    this.endMentionFlow = this.endMentionFlow.bind(this);
    this.onDropFiles = this.onDropFiles.bind(this);
    this.onPasteFiles = this.onPasteFiles.bind(this);
    this.onWindowClick = this.onWindowClick.bind(this);
    this.setElements = this.setElements.bind(this);
    this.updateSelectionState = this.updateSelectionState.bind(this);
    this.assetUploader = new AssetUploader(new AssetService(resolve(graph.BackendClient)));

    this.shadowInput = null;
    this.textarea = null;

    this.selectionStart = ko.observable(0);
    this.selectionEnd = ko.observable(0);

    this.emojiInput = contentViewModel.emojiInput;

    this.eventRepository = repositories.event;
    this.conversationRepository = repositories.conversation;
    this.searchRepository = repositories.search;
    this.storageRepository = repositories.storage;
    this.userRepository = repositories.user;
    this.ParticipantAvatar = ParticipantAvatar;
    this.logger = getLogger('z.viewModel.content.InputBarViewModel');

    this.conversationEntity = this.conversationRepository.active_conversation;
    this.selfUser = this.userRepository.self;

    this.conversationHasFocus = ko.observable(true).extend({notify: 'always'});

    this.editMessageEntity = ko.observable();
    this.replyMessageEntity = ko.observable();

    const handleRepliedMessageDeleted = messageId => {
      if (this.replyMessageEntity() && this.replyMessageEntity().id === messageId) {
        this.replyMessageEntity(undefined);
      }
    };

    const handleRepliedMessageUpdated = (originalMessageId, messageEntity) => {
      if (this.replyMessageEntity() && this.replyMessageEntity().id === originalMessageId) {
        this.replyMessageEntity(messageEntity);
      }
    };

    ko.pureComputed(() => !!this.replyMessageEntity())
      .extend({notify: 'always', rateLimit: 100})
      .subscribeChanged((isReplyingToMessage, wasReplyingToMessage) => {
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
    this.hasTextInput = ko.pureComputed(() => this.input().length);

    this.input = ko.observable('');

    this.input.subscribeChanged((newValue, oldValue) => {
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
          const textPiece = escapeString(piece).replace(/[\r\n]/g, '<br>');
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
        const name = userEntity.first_name();
        const availabilityStrings = {
          [Availability.Type.AVAILABLE]: t('tooltipConversationInputPlaceholderAvailable', name),
          [Availability.Type.AWAY]: t('tooltipConversationInputPlaceholderAway', name),
          [Availability.Type.BUSY]: t('tooltipConversationInputPlaceholderBusy', name),
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

        const date = moment(blob.lastModifiedDate).format('LL, LTS');
        return this.pastedFileName(t('conversationSendPastedFile', date));
      }

      this.pastedFilePreviewUrl(null);
      this.pastedFileName(null);
    });

    this.hasLocalEphemeralTimer = ko.pureComputed(() => {
      const conversationEntity = this.conversationEntity();
      return conversationEntity.localMessageTimer() && !conversationEntity.hasGlobalMessageTimer();
    });

    this.conversationEntity.subscribe(this.loadInitialStateForConversation.bind(this));
    this.draftMessage.subscribe(message => {
      if (this.conversationEntity()) {
        this._saveDraftState(this.conversationEntity(), message.text, message.mentions, message.reply);
      }
    });

    this.renderMessage = renderMessage;

    this._initSubscriptions();
  }

  _initSubscriptions() {
    amplify.subscribe(WebAppEvents.CONVERSATION.IMAGE.SEND, this.uploadImages.bind(this));
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.EDIT, this.editMessage.bind(this));
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.REPLY, this.replyMessage.bind(this));
    amplify.subscribe(WebAppEvents.EXTENSIONS.GIPHY.SEND, this.sendGiphy.bind(this));
    amplify.subscribe(WebAppEvents.SEARCH.SHOW, () => this.conversationHasFocus(false));
    amplify.subscribe(WebAppEvents.SEARCH.HIDE, () => {
      window.requestAnimationFrame(() => this.conversationHasFocus(true));
    });
  }

  setElements(nodes) {
    this.textarea = nodes.find(node => node.id === 'conversation-input-bar-text');
    this.shadowInput = nodes.find(node => node.classList && node.classList.contains('shadow-input'));
    this.updateSelectionState();
  }

  async loadInitialStateForConversation(conversationEntity) {
    this.conversationHasFocus(true);
    this.pastedFile(null);
    this.cancelMessageEditing();
    this.cancelMessageReply();
    this.endMentionFlow();

    if (conversationEntity) {
      const previousSessionData = await this._loadDraftState(conversationEntity);
      this.input(previousSessionData.text);
      this.currentMentions(previousSessionData.mentions);

      if (previousSessionData.replyEntityPromise) {
        previousSessionData.replyEntityPromise.then(replyEntity => {
          if (replyEntity && replyEntity.isReplyable()) {
            this.replyMessageEntity(replyEntity);
          }
        });
      }
    }
  }

  async _saveDraftState(conversationEntity, text, mentions, reply) {
    if (!this.isEditing()) {
      // we only save state for newly written messages
      reply = reply && reply.id ? {messageId: reply.id} : {};
      const storageKey = this._generateStorageKey(conversationEntity);
      await this.storageRepository.storageService.saveToSimpleStorage(storageKey, {mentions, reply, text});
    }
  }

  _generateStorageKey(conversationEntity) {
    return `${StorageKey.CONVERSATION.INPUT}|${conversationEntity.id}`;
  }

  async _loadDraftState(conversationEntity) {
    const storageKey = this._generateStorageKey(conversationEntity);
    const storageValue = await this.storageRepository.storageService.loadFromSimpleStorage(storageKey);

    if (typeof storageValue === 'undefined') {
      return {mentions: [], reply: {}, text: ''};
    }

    if (typeof storageValue === 'string') {
      return {mentions: [], reply: {}, text: storageValue};
    }

    storageValue.mentions = storageValue.mentions.map(mention => {
      return new MentionEntity(mention.startIndex, mention.length, mention.userId);
    });

    const replyMessageId = storageValue.reply ? storageValue.reply.messageId : undefined;

    if (replyMessageId) {
      storageValue.replyEntityPromise = this.conversationRepository.get_message_in_conversation_by_id(
        conversationEntity,
        replyMessageId,
        false,
        true,
      );
    }

    return storageValue;
  }

  _resetDraftState() {
    this.currentMentions.removeAll();
    this.input('');
  }

  _createMentionEntity(userEntity) {
    const mentionLength = userEntity.name().length + 1;
    return new MentionEntity(this.editedMention().startIndex, mentionLength, userEntity.id);
  }

  addMention(userEntity, inputElement) {
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

  editMessage(messageEntity) {
    if (messageEntity && messageEntity.is_editable() && messageEntity !== this.editMessageEntity()) {
      this.cancelMessageReply();
      this.cancelMessageEditing();
      this.editMessageEntity(messageEntity);

      this.input(messageEntity.get_first_asset().text);
      const newMentions = messageEntity
        .get_first_asset()
        .mentions()
        .slice();
      this.currentMentions(newMentions);

      if (messageEntity.quote()) {
        this.conversationRepository
          .get_message_in_conversation_by_id(this.conversationEntity(), messageEntity.quote().messageId)
          .then(quotedMessage => this.replyMessageEntity(quotedMessage));
      }

      this._moveCursorToEnd();
    }
  }

  replyMessage(messageEntity) {
    if (messageEntity && messageEntity.isReplyable() && messageEntity !== this.replyMessageEntity()) {
      this.cancelMessageReply(false);
      this.cancelMessageEditing(!!this.editMessageEntity());
      this.replyMessageEntity(messageEntity);
      this.textarea.focus();
    }
  }

  onDropFiles(droppedFiles) {
    const images = [];
    const files = [];

    const tooManyConcurrentUploads = this._isHittingUploadLimit(droppedFiles);
    if (!tooManyConcurrentUploads) {
      Array.from(droppedFiles).forEach(file => {
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

  onPasteFiles(pastedFiles) {
    const [pastedFile] = pastedFiles;
    this.pastedFile(pastedFile);
  }

  onWindowClick(event) {
    if (!$(event.target).closest('.conversation-input-bar, .conversation-input-bar-mention-suggestion').length) {
      this.cancelMessageEditing();
      this.cancelMessageReply();
    }
  }

  onInputEnter(data, event) {
    if (this.pastedFile()) {
      return this.sendPastedFile();
    }

    const beforeLength = this.input().length;
    const messageTrimmedStart = this.input().trimLeft();
    const afterLength = messageTrimmedStart.length;

    const updatedMentions = this.updateMentionRanges(this.currentMentions(), 0, 0, afterLength - beforeLength);
    this.currentMentions(updatedMentions);

    const messageText = messageTrimmedStart.trimRight();

    const isMessageTextTooLong = messageText.length > Config.MAXIMUM_MESSAGE_LENGTH;
    if (isMessageTextTooLong) {
      return amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, {
        text: {
          message: t('modalConversationMessageTooLongMessage', Config.MAXIMUM_MESSAGE_LENGTH),
          title: t('modalConversationMessageTooLongHeadline'),
        },
      });
    }

    if (this.isEditing()) {
      this.sendMessageEdit(messageText, this.editMessageEntity(), this.replyMessageEntity());
    } else {
      this.sendMessage(messageText, this.replyMessageEntity());
    }

    this._resetDraftState();
    $(event.target).focus();
  }

  onInputKeyDown(data, keyboardEvent) {
    const textAreaValue = $(keyboardEvent.target).val();

    // Manually move the cursor when pressing "Page Up", and do nothing else
    // see https://bugs.chromium.org/p/chromium/issues/detail?id=890248
    if (keyboardEvent.keyCode === 33) {
      keyboardEvent.target.setSelectionRange(0, 0);
      return false;
    }

    // Manually move the cursor when pressing "Page Down", and do nothing else
    if (keyboardEvent.keyCode === 34 && textAreaValue) {
      keyboardEvent.target.setSelectionRange(textAreaValue.length, textAreaValue.length);
      return false;
    }

    const inputHandledByEmoji = !this.editedMention() && this.emojiInput.onInputKeyDown(data, keyboardEvent);

    if (!inputHandledByEmoji) {
      switch (keyboardEvent.key) {
        case KEY.ARROW_UP: {
          if (!isFunctionKey(keyboardEvent) && !this.input().length) {
            this.editMessage(this.conversationEntity().get_last_editable_message());
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
            insertAtCaret(keyboardEvent.target, '\n');
            ko.utils.triggerEvent(keyboardEvent.target, 'change');
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
   * @param {number} selectionStart - Current caret position or start of selection  (if text is marked)
   * @param {number} selectionEnd - Current caret position or end of selection (if text is marked)
   * @param {string} value - Text input
   * @returns {undefined|{startIndex: number, term: string}} Matched mention info
   */
  getMentionCandidate(selectionStart, selectionEnd, value) {
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

  updateMentions(data, event) {
    const textarea = event.target;
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

  detectMentionEdgeDeletion(textarea, lengthDifference) {
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

  updateMentionRanges(mentions, start, end, difference) {
    const remainingMentions = mentions.filter(({startIndex, endIndex}) => endIndex <= start || startIndex >= end);

    remainingMentions.forEach(mention => {
      if (mention.startIndex >= end) {
        mention.startIndex += difference;
      }
    });

    return remainingMentions;
  }

  findMentionAtPosition(position, mentions) {
    return mentions.find(({startIndex, endIndex}) => position > startIndex && position < endIndex);
  }

  onInputKeyUp(data, keyboardEvent) {
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

  sendGiphy(gifUrl, tag) {
    const conversationEntity = this.conversationEntity();
    const replyMessageEntity = this.replyMessageEntity();
    this._generateQuote(replyMessageEntity).then(quoteEntity => {
      this.conversationRepository.sendGif(conversationEntity, gifUrl, tag, quoteEntity);
      this.cancelMessageEditing(true);
    });
  }

  _generateQuote(replyMessageEntity) {
    return !replyMessageEntity
      ? Promise.resolve()
      : this.eventRepository
          .loadEvent(replyMessageEntity.conversation_id, replyMessageEntity.id)
          .then(MessageHasher.hashEvent)
          .then(messageHash => {
            return new QuoteEntity({
              hash: messageHash,
              messageId: replyMessageEntity.id,
              userId: replyMessageEntity.from,
            });
          });
  }

  sendMessage(messageText, replyMessageEntity) {
    if (messageText.length) {
      const mentionEntities = this.currentMentions.slice();

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

  sendMessageEdit(messageText, messageEntity) {
    const mentionEntities = this.currentMentions.slice();
    this.cancelMessageEditing();

    if (!messageText.length) {
      return this.conversationRepository.deleteMessageForEveryone(this.conversationEntity(), messageEntity);
    }

    this.conversationRepository
      .sendMessageEdit(this.conversationEntity(), messageText, messageEntity, mentionEntities)
      .catch(error => {
        if (error.type !== z.error.ConversationError.TYPE.NO_MESSAGE_CHANGES) {
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
   * @param {Array|FileList} images - Images
   * @returns {undefined} No return value
   */
  uploadImages(images) {
    if (!this._isHittingUploadLimit(images)) {
      for (const image of Array.from(images)) {
        const isTooLarge = image.size > Config.MAXIMUM_IMAGE_FILE_SIZE;
        if (isTooLarge) {
          return this._showUploadWarning(image);
        }
      }

      this.conversationRepository.upload_images(this.conversationEntity(), images);
    }
  }

  /**
   * Post files to a conversation.
   * @param {Array|FileList} files - Files
   * @returns {undefined} No return value
   */
  uploadFiles(files) {
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
      ? Config.MAXIMUM_ASSET_FILE_SIZE_TEAM
      : Config.MAXIMUM_ASSET_FILE_SIZE_PERSONAL;
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

  _isHittingUploadLimit(files) {
    const concurrentUploadLimit = InputBarViewModel.CONFIG.ASSETS.CONCURRENT_UPLOAD_LIMIT;
    const concurrentUploads = files.length + this.assetUploader.getNumberOfOngoingUploads();
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

  _showUploadWarning(image) {
    const isGif = image.type === 'image/gif';
    const maxSize = Config.MAXIMUM_IMAGE_FILE_SIZE / 1024 / 1024;
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
};
