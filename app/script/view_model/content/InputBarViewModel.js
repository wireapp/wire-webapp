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
        FILE_TYPES: ['image/bmp', 'image/jpeg', 'image/jpg', 'image/png', '.jpg-large'],
      },
      PING_TIMEOUT: 2000,
    };
  }

  constructor(mainViewModel, contentViewModel, repositories) {
    this.addedToView = this.addedToView.bind(this);
    this.clickToPing = this.clickToPing.bind(this);
    this.onDropFiles = this.onDropFiles.bind(this);
    this.onPasteFiles = this.onPasteFiles.bind(this);
    this.onWindowClick = this.onWindowClick.bind(this);

    this.emojiInput = contentViewModel.emojiInput;

    this.conversationRepository = repositories.conversation;
    this.userRepository = repositories.user;
    this.logger = new z.util.Logger('z.viewModel.content.InputBarViewModel', z.config.LOGGER.OPTIONS);

    this.conversationEntity = this.conversationRepository.active_conversation;
    this.selfUser = this.userRepository.self;

    this.conversationHasFocus = ko.observable(true).extend({notify: 'always'});

    this.editMessageEntity = ko.observable();
    this.editInput = ko.observable('');

    this.pastedFile = ko.observable();
    this.pastedFilePreviewUrl = ko.observable();
    this.pastedFileName = ko.observable();

    this.pingDisabled = ko.observable(false);

    this.ephemeralTimerText = ko.pureComputed(() => {
      if (this.hasEphemeralTimer()) {
        return z.util.TimeUtil.formatMilliseconds(this.conversationEntity().ephemeral_timer());
      }
      return {};
    });
    this.hasConversation = ko.pureComputed(() => !!this.conversationEntity());
    this.hasEphemeralTimer = ko.pureComputed(() => {
      return this.hasConversation() ? this.conversationEntity().ephemeral_timer() : false;
    });
    this.hasFocus = ko.pureComputed(() => this.isEditing() || this.conversationHasFocus()).extend({notify: 'always'});
    this.hasTextInput = ko.pureComputed(() => {
      return this.hasConversation() ? this.conversationEntity().input().length > 0 : false;
    });

    this.input = ko.pureComputed({
      read: () => {
        if (this.isEditing()) {
          return this.editInput();
        }

        if (this.conversationEntity()) {
          return this.conversationEntity().input() || '';
        }

        return '';
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

    this.inputPlaceholder = ko.pureComputed(() => {
      let stringId;

      if (this.showAvailabilityTooltip()) {
        const userEntity = this.conversationEntity().firstUserEntity();

        switch (userEntity.availability()) {
          case z.user.AvailabilityType.AVAILABLE:
            stringId = z.string.tooltipConversationInputPlaceholderAvailable;
            break;
          case z.user.AvailabilityType.AWAY:
            stringId = z.string.tooltipConversationInputPlaceholderAway;
            break;
          case z.user.AvailabilityType.BUSY:
            stringId = z.string.tooltipConversationInputPlaceholderBusy;
            break;
        }

        return z.l10n.text(stringId, userEntity.first_name());
      }

      stringId = this.conversationEntity().ephemeral_timer()
        ? z.string.tooltipConversationEphemeral
        : z.string.tooltipConversationInputPlaceholder;

      return z.l10n.text(stringId);
    });

    this.isEditing = ko.pureComputed(() => !!this.editMessageEntity());

    this.showAvailabilityTooltip = ko.pureComputed(() => {
      if (this.hasConversation() && this.conversationEntity().firstUserEntity()) {
        const isOne2OneConversation = this.conversationEntity().is_one2one();
        const firstUserEntity = this.conversationEntity().firstUserEntity();
        const availabilityIsNone = firstUserEntity.availability() === z.user.AvailabilityType.NONE;
        return this.selfUser().inTeam() && isOne2OneConversation && !availabilityIsNone;
      }

      return false;
    });

    this.showGiphyButton = ko.pureComputed(() => {
      if (this.hasConversation() && this.hasTextInput()) {
        return this.conversationEntity().input().length <= InputBarViewModel.CONFIG.GIPHY_TEXT_LENGTH;
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

  addedToView() {
    amplify.subscribe(z.event.WebApp.SHORTCUT.PING, this.clickToPing);
  }

  cancelMessageEditing() {
    this.emojiInput.removeEmojiPopup();

    if (this.editMessageEntity()) {
      this.editMessageEntity().isEditing(false);
    }

    this.editMessageEntity(undefined);
    this.editInput('');
  }

  /**
   * Click on ephemeral button
   * @param {Object} data - Object
   * @param {DOMEvent} event - Triggered event
   * @returns {undefined} No return value
   */
  clickOnEphemeral(data, event) {
    const entries = [
      {
        click: () => this.setEphemeralTimer(0),
        label: z.l10n.text(z.string.ephememalUnitsNone),
      },
    ].concat(
      z.ephemeral.timings.getValues().map(milliseconds => {
        const {unit, value} = z.util.TimeUtil.formatMilliseconds(milliseconds);
        const localizedUnit = this._getLocalizedUnitString(value, unit);

        return {
          click: () => this.setEphemeralTimer(milliseconds),
          label: `${value} ${localizedUnit}`,
        };
      })
    );

    z.ui.Context.from(event, entries, 'ephemeral-options-menu');
  }

  clickToCancelPastedFile() {
    this.pastedFile(null);
  }

  clickToShowGiphy() {
    amplify.publish(z.event.WebApp.EXTENSIONS.GIPHY.SHOW);
  }

  clickToPing() {
    if (this.hasConversation() && !this.pingDisabled()) {
      this.pingDisabled(true);
      this.conversationRepository.send_knock(this.conversationEntity()).then(() => {
        window.setTimeout(() => this.pingDisabled(false), InputBarViewModel.CONFIG.PING_TIMEOUT);
      });
    }
  }

  editMessage(messageEntity, inputElement) {
    if (messageEntity && messageEntity.is_editable() && messageEntity !== this.editMessageEntity()) {
      this.cancelMessageEditing();
      this.editMessageEntity(messageEntity);
      this.editMessageEntity().isEditing(true);
      this.input(this.editMessageEntity().get_first_asset().text);
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

    const messageText = z.util.StringUtil.trimLineBreaks(this.input());

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

    this.input('');
    $(event.target).focus();
  }

  onInputKeyDown(data, keyboardEvent) {
    const inputHandledByEmoji = this.emojiInput.onInputKeyDown(data, keyboardEvent);

    if (!inputHandledByEmoji) {
      switch (keyboardEvent.key) {
        case z.util.KeyboardUtil.KEY.ARROW_UP: {
          if (!z.util.KeyboardUtil.isFunctionKey(keyboardEvent) && !this.input().length) {
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

  onInputKeyUp(data, keyboardEvent) {
    this.emojiInput.onInputKeyUp(data, keyboardEvent);
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

  setEphemeralTimer(milliseconds) {
    const conversationName = this.conversationEntity().display_name();

    if (!milliseconds) {
      this.conversationEntity().ephemeral_timer(false);
      return this.logger.info(`Ephemeral timer for conversation '${conversationName}' turned off.`);
    }

    this.conversationEntity().ephemeral_timer(milliseconds);
    this.logger.info(`Ephemeral timer for conversation '${conversationName}' is now at '${milliseconds}'.`);
  }

  sendGiphy() {
    if (this.hasConversation()) {
      this.conversationEntity().input('');
    }
  }

  sendMessage(messageText) {
    if (messageText.length) {
      this.conversationRepository.send_text_with_link_preview(messageText, this.conversationEntity());
    }
  }

  sendMessageEdit(messageText, messageEntity) {
    this.cancelMessageEditing();

    if (!messageText.length) {
      return this.conversationRepository.delete_message_everyone(this.conversationEntity(), messageEntity);
    }

    const isTextChange = messageText !== messageEntity.get_first_asset().text;
    if (isTextChange) {
      this.conversationRepository.send_message_edit(messageText, messageEntity, this.conversationEntity());
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
    if (!this._isHittingUploadLimit(files)) {
      for (const file of Array.from(files)) {
        const isTooLarge = file.size > z.config.MAXIMUM_ASSET_FILE_SIZE;
        if (isTooLarge) {
          const fileSize = z.util.format_bytes(z.config.MAXIMUM_ASSET_FILE_SIZE);
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

  /**
   * Returns the full localized unit string.
   *
   * @private
   * @param {number} value - Number to localize
   * @param {string} unit - Unit of type 's', 'm', 'd', 'h'
   * @returns {string} Localized unit string
   */
  _getLocalizedUnitString(value, unit) {
    let stringId;
    const valueIs1 = value === 1;

    if (unit === 's') {
      stringId = valueIs1 ? z.string.ephememalUnitsSecond : z.string.ephememalUnitsSeconds;
      return z.l10n.text(stringId);
    }

    if (unit === 'm') {
      stringId = valueIs1 ? z.string.ephememalUnitsMinute : z.string.ephememalUnitsMinutes;
      return z.l10n.text(stringId);
    }

    if (unit === 'd') {
      stringId = valueIs1 ? z.string.ephememalUnitsDay : z.string.ephememalUnitsDays;
      return z.l10n.text(stringId);
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
