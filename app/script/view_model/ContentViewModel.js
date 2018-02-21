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

z.viewModel.ContentViewModel = class ContentViewModel {
  constructor(mainViewModel, repositories) {
    this.showConversation = this.showConversation.bind(this);
    this.switchContent = this.switchContent.bind(this);
    this.switchPreviousContent = this.switchPreviousContent.bind(this);

    this.elementId = 'center-column';
    this.mainViewModel = mainViewModel;
    this.conversationRepository = repositories.conversation;
    this.userRepository = repositories.user;
    this.logger = new z.util.Logger('z.viewModel.ContentViewModel', z.config.LOGGER.OPTIONS);

    // State
    this.contentState = ko.observable(z.viewModel.content.CONTENT_STATE.WATERMARK);
    this.multitasking = {
      autoMinimize: ko.observable(true),
      isMinimized: ko.observable(false),
      resetMinimize: ko.observable(false),
    };

    // Nested view models
    this.collectionDetails = new z.viewModel.content.CollectionDetailsViewModel();
    this.collection = new z.viewModel.content.CollectionViewModel(mainViewModel, this, repositories);
    this.connectRequests = new z.viewModel.content.ConnectRequestsViewModel(mainViewModel, this, repositories);
    this.emojiInput = new z.viewModel.content.EmojiInputViewModel(mainViewModel, this, repositories);
    this.giphy = new z.viewModel.content.GiphyViewModel(mainViewModel, this, repositories);
    this.inputBar = new z.viewModel.content.InputBarViewModel(mainViewModel, this, repositories);
    this.groupCreation = new z.viewModel.content.GroupCreationViewModel(mainViewModel, this, repositories);
    this.messageList = new z.viewModel.content.MessageListViewModel(mainViewModel, this, repositories);
    this.titleBar = new z.viewModel.content.TitleBarViewModel(mainViewModel, this, repositories);
    this.videoCalling = new z.viewModel.content.VideoCallingViewModel(mainViewModel, this, repositories);

    this.preferencesAbout = new z.viewModel.content.PreferencesAboutViewModel(mainViewModel, this, repositories);
    this.preferencesAccount = new z.viewModel.content.PreferencesAccountViewModel(mainViewModel, this, repositories);
    this.preferencesAv = new z.viewModel.content.PreferencesAVViewModel(mainViewModel, this, repositories);
    this.preferencesDeviceDetails = new z.viewModel.content.PreferencesDeviceDetailsViewModel(
      mainViewModel,
      this,
      repositories
    );
    this.preferencesDevices = new z.viewModel.content.PreferencesDevicesViewModel(mainViewModel, this, repositories);
    this.preferencesOptions = new z.viewModel.content.PreferencesOptionsViewModel(mainViewModel, this, repositories);

    this.previousState = undefined;
    this.previousConversation = undefined;

    this.contentState.subscribe(contentState => {
      switch (contentState) {
        case z.viewModel.content.CONTENT_STATE.CONVERSATION:
          this.inputBar.added_to_view();
          this.titleBar.addedToView();
          break;
        case z.viewModel.content.CONTENT_STATE.PREFERENCES_ACCOUNT:
          this.preferencesAccount.check_new_clients();
          break;
        case z.viewModel.content.CONTENT_STATE.PREFERENCES_AV:
          this.preferencesAv.initiateDevices();
          break;
        case z.viewModel.content.CONTENT_STATE.PREFERENCES_DEVICES:
          this.preferencesDevices.update_device_info();
          break;
        case z.viewModel.content.CONTENT_STATE.COLLECTION:
          this.collection.setConversation(this.previousConversation);
          break;
        default:
          this.inputBar.removed_from_view();
          this.titleBar.removedFromView();
      }
    });

    this.userRepository.connect_requests.subscribe(requests => {
      const isStateRequests = this.contentState() === z.viewModel.content.CONTENT_STATE.CONNECTION_REQUESTS;
      if (isStateRequests && !requests.length) {
        this.showConversation(this.conversationRepository.getMostRecentConversation());
      }
    });

    this._initSubscriptions();

    ko.applyBindings(this, document.getElementById(this.elementId));
  }

  _initSubscriptions() {
    amplify.subscribe(z.event.WebApp.CONTENT.SWITCH, this.switchContent.bind(this));
    amplify.subscribe(z.event.WebApp.CONVERSATION.SHOW, this.showConversation.bind(this));
    amplify.subscribe(z.event.WebApp.LIST.SCROLL, this.inputBar.show_separator);
    amplify.subscribe(z.event.WebApp.WINDOW.RESIZE.HEIGHT, this.messageList.scroll_height);
  }

  /**
   * Slide in specified content.
   * @param {string} contentSelector - DOM element to apply slide in animation
   * @returns {undefined} No return value
   */
  _shiftContent(contentSelector) {
    const incomingCssClass = 'content-animation-incoming-horizontal-left';

    $(contentSelector)
      .removeClass(incomingCssClass)
      .off(z.util.alias.animationend)
      .addClass(incomingCssClass)
      .one(z.util.alias.animationend, function() {
        $(this)
          .removeClass(incomingCssClass)
          .off(z.util.alias.animationend);
      });
  }

  /**
   * Opens the specified conversation.
   *
   * @note If the conversation_et is not defined, it will open the incoming connection requests instead
   *  Conversation_et can also just be the conversation ID
   *
   * @param {z.entity.Conversation|string} conversation - Conversation entity or conversation ID
   * @param {z.entity.Message} [messageEntity] - Message to scroll to
   * @returns {undefined} No return value
   */
  showConversation(conversation, messageEntity) {
    if (!conversation) {
      return this.switchContent(z.viewModel.content.CONTENT_STATE.CONNECTION_REQUESTS);
    }

    const isConversation = typeof conversation === 'object' && conversation.id;
    const isConversationId = typeof conversation === 'string';
    if (!isConversation && !isConversationId) {
      throw new Error(`Wrong input for conversation: ${typeof conversation}`);
    }

    const conversationPromise = isConversation
      ? Promise.resolve(conversation)
      : this.conversationRepository.get_conversation_by_id(conversation);

    conversationPromise.then(conversationEntity => {
      const isActiveConversation = conversationEntity === this.conversationRepository.active_conversation();
      const isConversationState = this.contentState() === z.viewModel.content.CONTENT_STATE.CONVERSATION;

      if (conversationEntity && isActiveConversation && isConversationState) {
        return;
      }

      this._releaseContent(this.contentState());

      this.contentState(z.viewModel.content.CONTENT_STATE.CONVERSATION);
      this.conversationRepository.active_conversation(conversationEntity);
      this.messageList.change_conversation(conversationEntity, messageEntity).then(() => {
        this._showContent(z.viewModel.content.CONTENT_STATE.CONVERSATION);
        this.mainViewModel.panel.participants.changeConversation(conversationEntity);
        this.previousConversation = this.conversationRepository.active_conversation();
      });
    });
  }

  switchContent(newContentState) {
    const stateUnchanged = newContentState === this.contentState();
    if (!stateUnchanged) {
      this._releaseContent(newContentState);
      this._showContent(this._checkContentAvailability(newContentState));
    }
  }

  switchPreviousContent() {
    const stateUnchanged = this.previousState === this.contentState();
    if (!stateUnchanged) {
      const isStateRequests = this.previousState === z.viewModel.content.CONTENT_STATE.CONNECTION_REQUESTS;
      if (isStateRequests) {
        this.switchContent(z.viewModel.content.CONTENT_STATE.CONNECTION_REQUESTS);
      }

      if (this.previousConversation && !this.previousConversation.is_archived()) {
        return this.showConversation(this.previousConversation);
      }

      return this.switchContent(z.viewModel.content.CONTENT_STATE.WATERMARK);
    }
  }

  _checkContentAvailability(contentState) {
    const isStateRequests = contentState === z.viewModel.content.CONTENT_STATE.CONNECTION_REQUESTS;
    if (isStateRequests) {
      if (!this.userRepository.connectRequests().length) {
        return z.viewModel.content.CONTENT_STATE.WATERMARK;
      }
    }
    return contentState;
  }

  _getElementOfContent(contentState) {
    switch (contentState) {
      case z.viewModel.content.CONTENT_STATE.COLLECTION:
        return '.collection';
      case z.viewModel.content.CONTENT_STATE.COLLECTION_DETAILS:
        return '.collection-details';
      case z.viewModel.content.CONTENT_STATE.CONVERSATION:
        return '.conversation';
      case z.viewModel.content.CONTENT_STATE.CONNECTION_REQUESTS:
        return '.connect-requests';
      case z.viewModel.content.CONTENT_STATE.PREFERENCES_ABOUT:
        return '.preferences-about';
      case z.viewModel.content.CONTENT_STATE.PREFERENCES_ACCOUNT:
        return '.preferences-account';
      case z.viewModel.content.CONTENT_STATE.PREFERENCES_AV:
        return '.preferences-av';
      case z.viewModel.content.CONTENT_STATE.PREFERENCES_DEVICE_DETAILS:
        return '.preferences-device-details';
      case z.viewModel.content.CONTENT_STATE.PREFERENCES_DEVICES:
        return '.preferences-devices';
      case z.viewModel.content.CONTENT_STATE.PREFERENCES_OPTIONS:
        return '.preferences-options';
      default:
        return '.watermark';
    }
  }

  _releaseContent(newContentState) {
    this.previousState = this.contentState();

    const isStateConversation = this.previousState === z.viewModel.content.CONTENT_STATE.CONVERSATION;
    if (isStateConversation) {
      const collectionStates = [
        z.viewModel.content.CONTENT_STATE.COLLECTION,
        z.viewModel.content.CONTENT_STATE.COLLECTION_DETAILS,
      ];
      const isCollectionState = collectionStates.includes(newContentState);
      if (!isCollectionState) {
        this.conversationRepository.active_conversation(null);
      }

      return this.messageList.release_conversation();
    }

    const isStatePreferencesAv = this.previousState === z.viewModel.content.CONTENT_STATE.PREFERENCES_AV;
    if (isStatePreferencesAv) {
      this.preferencesAv.release_devices();
    }
  }

  _showContent(newContentState) {
    this.contentState(newContentState);
    return this._shiftContent(this._getElementOfContent(newContentState));
  }
};
