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

'use strict';

window.z = window.z || {};
window.z.viewModel = z.viewModel || {};
window.z.viewModel.content = z.viewModel.content || {};

// Parent: z.viewModel.ContentViewModel
z.viewModel.content.InputBarViewModel = class InputBarViewModel {
  static get CONFIG() {
    return {
      ASSETS: {
        CONCURRENT_UPLOAD_LIMIT: 10,
      },
      GIPHY_TEXT_LENGTH: 256,
      IMAGE: {
        FILE_TYPES: ['image/bmp', 'image/gif', 'image/jpeg', 'image/jpg', 'image/png', '.jpg-large'],
      },
      PING_TIMEOUT: z.util.TimeUtil.UNITS_IN_MILLIS.SECOND * 2,
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
    this.updateSelectionState = this.updateSelectionState.bind(this);

    this.selectionStart = ko.observable(0);
    this.selectionEnd = ko.observable(0);

    this.emojiInput = contentViewModel.emojiInput;

    this.conversationRepository = repositories.conversation;
    this.searchRepository = repositories.search;
    this.userRepository = repositories.user;
    this.logger = new z.util.Logger('z.viewModel.content.InputBarViewModel', z.config.LOGGER.OPTIONS);

    this.conversationEntity = this.conversationRepository.active_conversation;
    this.selfUser = this.userRepository.self;

    this.conversationHasFocus = ko.observable(true).extend({notify: 'always'});

    this.editMessageEntity = ko.observable();
    this.isEditing = ko.pureComputed(() => !!this.editMessageEntity());
    this.editInput = ko.observable({mentions: [], text: ''});

    this.pastedFile = ko.observable();
    this.pastedFilePreviewUrl = ko.observable();
    this.pastedFileName = ko.observable();

    this.pingDisabled = ko.observable(false);

    this.hasFocus = ko.pureComputed(() => this.isEditing() || this.conversationHasFocus()).extend({notify: 'always'});
    this.hasTextInput = ko.pureComputed(() => {
      return this.conversationEntity() ? this.conversationEntity().input().text.length > 0 : false;
    });

    this.inputTextOnly = ko.pureComputed({
      read: () => this.input().text,
      write: value => this.input({mentions: this.currentMentions, text: value}),
    });

    this.input = ko.pureComputed({
      read: () => {
        let inputObject = {mentions: [], text: ''};

        if (this.isEditing()) {
          inputObject = this.editInput();
        } else if (this.conversationEntity() && this.conversationEntity().input()) {
          inputObject = this.conversationEntity().input();

          this.currentMentions = inputObject.mentions.map(
            mention => new z.message.MentionEntity(mention.startIndex, mention.length, mention.userId)
          );
          this.updateSelectionState();
        }

        return inputObject;
      },
      write: value => {
        if (this.isEditing()) {
          return this.editInput(value);
        }

        if (this.conversationEntity()) {
          this.conversationEntity().input(value);
        }
      },
    });

    this.mentionSuggestions = ko.pureComputed(() => {
      const editedMention = this.editedMention();
      if (!editedMention || !this.conversationEntity()) {
        return [];
      }
      const candidates = this.conversationEntity()
        .participating_user_ets()
        .filter(userEntity => !userEntity.isService && !userEntity.isTemporaryGuest());
      return this.searchRepository.searchUserInSet(editedMention.term, candidates);
    });

    this.richTextInput = ko.pureComputed(() => {
      const text = this.input().text;

      const pieces = this.currentMentions
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
          [text]
        );
      const mentionAttrs = ' class="input-mention" data-uie-name="item-input-mention"';
      return pieces.map((piece, index) => `<span${index % 2 ? mentionAttrs : ''}>${piece}</span>`).join('');
    });

    this.editedMention = ko.observable(undefined);
    this.currentMentions = [];

    this.inputPlaceholder = ko.pureComputed(() => {
      if (this.showAvailabilityTooltip()) {
        const userEntity = this.conversationEntity().firstUserEntity();

        const availabilityStrings = {
          [z.user.AvailabilityType.AVAILABLE]: z.string.tooltipConversationInputPlaceholderAvailable,
          [z.user.AvailabilityType.AWAY]: z.string.tooltipConversationInputPlaceholderAway,
          [z.user.AvailabilityType.BUSY]: z.string.tooltipConversationInputPlaceholderBusy,
        };

        return z.l10n.text(availabilityStrings[userEntity.availability()], userEntity.first_name());
      }

      const stringId = this.conversationEntity().messageTimer()
        ? z.string.tooltipConversationEphemeral
        : z.string.tooltipConversationInputPlaceholder;

      return z.l10n.text(stringId);
    });

    this.showAvailabilityTooltip = ko.pureComputed(() => {
      if (this.conversationEntity() && this.conversationEntity().firstUserEntity()) {
        const isOne2OneConversation = this.conversationEntity().is_one2one();
        const firstUserEntity = this.conversationEntity().firstUserEntity();
        const availabilityIsNone = firstUserEntity.availability() === z.user.AvailabilityType.NONE;
        return this.selfUser().inTeam() && isOne2OneConversation && !availabilityIsNone;
      }

      return false;
    });

    this.showGiphyButton = ko.pureComputed(() => {
      if (this.conversationEntity() && this.hasTextInput()) {
        return this.conversationEntity().input().text.length <= InputBarViewModel.CONFIG.GIPHY_TEXT_LENGTH;
      }
    });

    const pingShortcut = z.ui.Shortcut.getShortcutTooltip(z.ui.ShortcutType.PING);
    this.pingTooltip = z.l10n.text(z.string.tooltipConversationPing, pingShortcut);

    this.conversationEntity.subscribe(() => {
      this.conversationHasFocus(true);
      this.pastedFile(null);
      this.cancelMessageEditing();
    });

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

        const date = moment(blob.lastModifiedDate).format('MMMM Do YYYY, h:mm:ss a');
        return this.pastedFileName(z.l10n.text(z.string.conversationSendPastedFile, date));
      }

      this.pastedFilePreviewUrl(null);
      this.pastedFileName(null);
    });

    this.hasLocalEphemeralTimer = ko.pureComputed(() => {
      const conversationEntity = this.conversationEntity();
      return conversationEntity.localMessageTimer() && !conversationEntity.hasGlobalMessageTimer();
    });

    this._init_subscriptions();
  }

  _init_subscriptions() {
    amplify.subscribe(z.event.WebApp.CONVERSATION.IMAGE.SEND, this.uploadImages.bind(this));
    amplify.subscribe(z.event.WebApp.CONVERSATION.MESSAGE.EDIT, this.editMessage.bind(this));
    amplify.subscribe(z.event.WebApp.EXTENSIONS.GIPHY.SEND, this.sendGiphy.bind(this));
    amplify.subscribe(z.event.WebApp.SEARCH.SHOW, () => this.conversationHasFocus(false));
    amplify.subscribe(z.event.WebApp.SEARCH.HIDE, () =>
      window.requestAnimationFrame(() => this.conversationHasFocus(true))
    );
  }

  addMention(userEntity, inputElement) {
    const editedMention = this.editedMention();
    const mentionEntity = new z.message.MentionEntity(editedMention.start, userEntity.name().length + 1, userEntity.id);

    this.currentMentions.push(mentionEntity);

    // keep track of what is before and after the mention being edited
    const beforeMentionPartial = this.input().text.slice(0, mentionEntity.startIndex);
    const afterMentionPartial = this.input()
      .text.slice(mentionEntity.startIndex + editedMention.term.length + 1)
      .replace(/^ /, '');

    // insert the mention in between
    this.input({
      mentions: this.currentMentions,
      text: `${beforeMentionPartial}@${userEntity.name()} ${afterMentionPartial}`,
    });

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
    amplify.subscribe(z.event.WebApp.SHORTCUT.PING, this.clickToPing);
  }

  cancelMessageEditing() {
    this.emojiInput.removeEmojiPopup();

    if (this.editMessageEntity()) {
      this.editMessageEntity().isEditing(false);
    }

    this.editMessageEntity(undefined);
    this.editInput({mentions: [], text: ''});
  }

  clickToCancelPastedFile() {
    this.pastedFile(null);
  }

  clickToShowGiphy() {
    amplify.publish(z.event.WebApp.EXTENSIONS.GIPHY.SHOW);
  }

  clickToPing() {
    if (this.conversationEntity() && !this.pingDisabled()) {
      this.pingDisabled(true);
      this.conversationRepository.sendKnock(this.conversationEntity()).then(() => {
        window.setTimeout(() => this.pingDisabled(false), InputBarViewModel.CONFIG.PING_TIMEOUT);
      });
    }
  }

  editMessage(messageEntity, inputElement) {
    if (messageEntity && messageEntity.is_editable() && messageEntity !== this.editMessageEntity()) {
      this.cancelMessageEditing();
      this.editMessageEntity(messageEntity);
      this.editMessageEntity().isEditing(true);
      this.input({
        mentions: this.currentMentions,
        text: this.editMessageEntity().get_first_asset().text,
      });
      if (inputElement) {
        this._moveCursorToEnd(inputElement);
      }
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
    if (!$(event.target).closest('.conversation-input-bar').length) {
      this.cancelMessageEditing();
    }
  }

  onInputClick() {
    if (!this.hasTextInput()) {
      amplify.publish(z.event.WebApp.CONVERSATION.INPUT.CLICK);
    }
  }

  onInputEnter(data, event) {
    if (this.pastedFile()) {
      return this.sendPastedFile();
    }

    const messageText = z.util.StringUtil.trimLineBreaks(this.input().text);

    const isMessageTextTooLong = messageText.length > z.config.MAXIMUM_MESSAGE_LENGTH;
    if (isMessageTextTooLong) {
      return amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.ACKNOWLEDGE, {
        text: {
          message: z.l10n.text(z.string.modalConversationMessageTooLongMessage, z.config.MAXIMUM_MESSAGE_LENGTH),
          title: z.l10n.text(z.string.modalConversationMessageTooLongHeadline),
        },
      });
    }

    if (this.isEditing()) {
      this.sendMessageEdit(messageText, this.editMessageEntity());
    } else {
      this.sendMessage(messageText);
    }

    this.input({mentions: [], text: ''});
    this.currentMentions = [];
    $(event.target).focus();
  }

  onInputKeyDown(data, keyboardEvent) {
    const inputHandledByEmoji = this.emojiInput.onInputKeyDown(data, keyboardEvent);

    if (!inputHandledByEmoji) {
      switch (keyboardEvent.key) {
        case z.util.KeyboardUtil.KEY.ARROW_UP: {
          if (!z.util.KeyboardUtil.isFunctionKey(keyboardEvent) && !this.input().text.length) {
            this.editMessage(this.conversationEntity().get_last_editable_message(), keyboardEvent.target);
          }
          break;
        }

        case z.util.KeyboardUtil.KEY.ESC: {
          if (this.pastedFile()) {
            this.pastedFile(null);
          } else {
            this.cancelMessageEditing();
          }
          break;
        }

        case z.util.KeyboardUtil.KEY.ENTER: {
          if (keyboardEvent.altKey || keyboardEvent.metaKey) {
            z.util.KeyboardUtil.insertAtCaret(keyboardEvent.target, '\n');
            $(keyboardEvent.target).change();
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

  handleMentions() {
    const textarea = document.querySelector('#conversation-input-bar-text');
    const value = textarea.value;
    const {selectionStart, selectionEnd} = textarea;
    const text = value.substr(0, selectionEnd);
    if (this.editedMention()) {
      // we check that the user is currently typing something that looks like a mention
      const editedMentionText = text.match(/@(\w*)$/);
      if (!editedMentionText) {
        this.endMentionFlow();
      } else {
        const searchTerm = editedMentionText[1];
        const currentEditedMention = this.editedMention();
        this.editedMention(Object.assign({}, currentEditedMention, {term: searchTerm}));
      }
    } else {
      const startFlowRegexp = /(^| )@$/;
      if (startFlowRegexp.test(text)) {
        this.editedMention({start: selectionStart - 1, term: ''});
      }
      this.updateSelectionState();
    }
  }

  updateSelectionState() {
    const textarea = document.querySelector('#conversation-input-bar-text');
    const {selectionStart, selectionEnd} = textarea;
    const defaultRange = {endIndex: 0, startIndex: Infinity};
    const firstMention = this.findMentionAtPosition(selectionStart, this.currentMentions) || defaultRange;
    const lastMention = this.findMentionAtPosition(selectionEnd, this.currentMentions) || defaultRange;
    const mentionStart = Math.min(firstMention.startIndex, lastMention.startIndex);
    const mentionEnd = Math.max(firstMention.endIndex, lastMention.endIndex);
    const newStart = Math.min(mentionStart, selectionStart);
    const newEnd = Math.max(mentionEnd, selectionEnd);
    if (newStart !== textarea.selectionStart || newEnd !== textarea.selectionEnd) {
      textarea.selectionStart = newStart;
      textarea.selectionEnd = newEnd;
    }
    this.selectionStart(newStart);
    this.selectionEnd(newEnd);
  }

  updateMentions(data, event) {
    const textarea = event.target;
    const value = textarea.value;
    const previousValue = this.input().text;
    const lengthDifference = value.length - previousValue.length;
    const edgeMention = this.detectMentionEdgeDeletion(textarea, lengthDifference);
    if (edgeMention) {
      textarea.value = this.input().text;
      textarea.selectionStart = edgeMention.startIndex;
      textarea.selectionEnd = edgeMention.endIndex;
    } else {
      this.currentMentions = this.updateMentionRanges(
        this.currentMentions,
        this.selectionStart(),
        this.selectionEnd(),
        lengthDifference
      );
    }
    this.handleMentions();
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
    return this.findMentionAtPosition(checkPosition, this.currentMentions);
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
    this.emojiInput.onInputKeyUp(data, keyboardEvent);
    this.updateSelectionState();
  }

  removedFromView() {
    amplify.unsubscribeAll(z.event.WebApp.SHORTCUT.PING);
  }

  scrollMessageList(newListHeight, previousListHeight) {
    const antiscroll = $('.message-list').data('antiscroll');
    if (antiscroll) {
      antiscroll.rebuild();
    }

    if ($('.messages-wrap').isScrolledBottom()) {
      return $('.messages-wrap').scrollToBottom();
    }

    $('.messages-wrap').scrollBy(newListHeight - previousListHeight);
  }

  sendGiphy() {
    if (this.conversationEntity()) {
      this.conversationEntity().input({mentions: [], text: ''});
    }
  }

  sendMessage(messageText) {
    if (messageText.length) {
      const mentionEntities = this.currentMentions;
      this.conversationRepository.sendTextWithLinkPreview(messageText, this.conversationEntity(), mentionEntities);
    }
  }

  sendMessageEdit(messageText, messageEntity) {
    this.cancelMessageEditing();

    if (!messageText.length) {
      return this.conversationRepository.deleteMessageForEveryone(this.conversationEntity(), messageEntity);
    }

    const hasTextChanged = messageText !== messageEntity.get_first_asset().text;
    if (hasTextChanged) {
      this.conversationRepository.sendMessageEdit(messageText, messageEntity, this.conversationEntity());
    }
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
        const isTooLarge = image.size > z.config.MAXIMUM_IMAGE_FILE_SIZE;
        if (isTooLarge) {
          return this._showUploadWarning(image);
        }
      }

      this.conversationRepository.upload_images(this.conversationEntity(), images);
    }
  }

  /**
   * Post files to a conversation.
   * @param {Array|FileList} files - Images
   * @returns {undefined} No return value
   */
  uploadFiles(files) {
    const uploadLimit = this.selfUser().inTeam()
      ? z.config.MAXIMUM_ASSET_FILE_SIZE_TEAM
      : z.config.MAXIMUM_ASSET_FILE_SIZE_PERSONAL;
    if (!this._isHittingUploadLimit(files)) {
      for (const file of Array.from(files)) {
        const isTooLarge = file.size > uploadLimit;
        if (isTooLarge) {
          const fileSize = z.util.formatBytes(uploadLimit);
          const options = {
            text: {
              message: z.l10n.text(z.string.modalAssetTooLargeMessage, fileSize),
              title: z.l10n.text(z.string.modalAssetTooLargeHeadline),
            },
          };

          return amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.ACKNOWLEDGE, options);
        }
      }

      this.conversationRepository.upload_files(this.conversationEntity(), files);
    }
  }

  _isHittingUploadLimit(files) {
    const concurrentUploadLimit = InputBarViewModel.CONFIG.ASSETS.CONCURRENT_UPLOAD_LIMIT;
    const concurrentUploads = files.length + this.conversationRepository.get_number_of_pending_uploads();
    const isHittingUploadLimit = concurrentUploads > InputBarViewModel.CONFIG.ASSETS.CONCURRENT_UPLOAD_LIMIT;

    if (isHittingUploadLimit) {
      const modalOptions = {
        text: {
          message: z.l10n.text(z.string.modalAssetParallelUploadsMessage, concurrentUploadLimit),
          title: z.l10n.text(z.string.modalAssetParallelUploadsHeadline),
        },
      };

      amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.ACKNOWLEDGE, modalOptions);
    }

    return isHittingUploadLimit;
  }

  _moveCursorToEnd(input_element) {
    window.setTimeout(() => {
      const newSelectionStart = (input_element.selectionEnd = input_element.value.length * 2);
      input_element.selectionStart = newSelectionStart;
    }, 0);
  }

  _showUploadWarning(image) {
    const isGif = image.type === 'image/gif';
    const messageStringId = isGif ? z.string.modalGifTooLargeMessage : z.string.modalPictureTooLargeMessage;
    const titleStringId = isGif ? z.string.modalGifTooLargeHeadline : z.string.modalPictureTooLargeHeadline;

    const modalOptions = {
      text: {
        message: z.l10n.text(messageStringId, z.config.MAXIMUM_IMAGE_FILE_SIZE / 1024 / 1024),
        title: z.l10n.text(titleStringId),
      },
    };

    amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.ACKNOWLEDGE, modalOptions);
  }
};
